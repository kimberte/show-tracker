import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Show = { title: string; tvmaze_id: number };
type Episode = {
  id: number;
  name: string;
  season: number;
  number: number;
  airdate?: string | null;
  airtime?: string | null;
  airstamp?: string | null;
};

type TrackedEpisode = { show: Show; episode: Episode };

function getLocalNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";

  return {
    date: value("year") + "-" + value("month") + "-" + value("day"),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

function clockMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function isWithinWindow(now: number, target: number, windowMinutes: number) {
  const distance = Math.abs(now - target);
  return distance <= windowMinutes || distance >= 1440 - windowMinutes;
}

function parseTime(value: unknown, fallback = "08:00") {
  const match = String(value || fallback).slice(0, 5).match(/^(\\d{2}):(\\d{2})$/);
  if (!match) return [8, 0];
  return [Number(match[1]), Number(match[2])];
}

function readableDate(date: string) {
  const parsed = new Date(date + "T12:00:00Z");
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(parsed);
}

async function alreadyDelivered(db: any, key: string) {
  const { data } = await db
    .from("notification_deliveries")
    .select("id")
    .eq("delivery_key", key)
    .maybeSingle();

  return Boolean(data);
}

async function recordDelivery(
  db: any,
  userId: string,
  key: string,
  kind: "daily" | "episode",
  episodeId?: number,
) {
  await (db.from("notification_deliveries") as any).insert([{
    user_id: userId,
    delivery_key: key,
    kind,
    episode_id: episodeId ?? null,
  }]);
}

async function sendToUser(
  db: any,
  userId: string,
  payload: object,
) {
  const { data: subscriptions, error } = await (db.from("push_subscriptions") as any)
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) return 0;

  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await sendWebPush(subscription, payload);
      sent++;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
    }
  }

  return sent;
}

async function getEpisodes(shows: Show[]) {
  const results: TrackedEpisode[] = [];

  await Promise.all(
    shows.map(async (show) => {
      try {
        const response = await fetch(
          "https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes",
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data = await response.json();
        const episodes = (data?._embedded?.episodes || []) as Episode[];

        for (const episode of episodes) {
          if (episode.airdate) results.push({ show, episode });
        }
      } catch {
        // A single TVMaze failure should not prevent other users/shows from running.
      }
    }),
  );

  return results;
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== "Bearer " + expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    !pushConfigured() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json(
      { error: "Push service is not configured." },
      { status: 503 },
    );
  }

  const db: any = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: preferences, error: preferencesError } = await db
    .from("notification_preferences")
    .select(
      "user_id,daily_push,episode_alerts,episode_alert_minutes,push_time_local",
    )
    .or("daily_push.eq.true,episode_alerts.eq.true");

  if (preferencesError) {
    return NextResponse.json(
      { error: preferencesError.message },
      { status: 500 },
    );
  }

  const result = {
    users: preferences?.length || 0,
    daily: 0,
    episodes: 0,
    skipped: 0,
  };

  for (const preference of preferences || []) {
    try {
      const { data: profile } = await db
        .from("profiles")
        .select("timezone")
        .eq("id", preference.user_id)
        .maybeSingle();

      const timezone = profile?.timezone || "UTC";
      const now = getLocalNow(timezone);

      const { data: tracked, error: trackedError } = await db
        .from("tracked_shows")
        .select("show:shows(title,tvmaze_id)")
        .eq("user_id", preference.user_id);

      if (trackedError) {
        result.skipped++;
        continue;
      }

      const shows = (tracked || [])
        .map((row: any) => row.show)
        .filter(Boolean) as Show[];

      if (!shows.length) {
        result.skipped++;
        continue;
      }

      const episodes = await getEpisodes(shows);

      if (preference.daily_push) {
        const [targetHour, targetMinute] = parseTime(
          preference.push_time_local,
        );
        const target = clockMinutes(targetHour, targetMinute);
        const current = clockMinutes(now.hour, now.minute);
        const deliveryKey = "daily:" + preference.user_id + ":" + now.date;

        if (
          isWithinWindow(current, target, 4) &&
          !(await alreadyDelivered(db, deliveryKey))
        ) {
          const today = episodes
            .filter(({ episode }) => episode.airdate === now.date)
            .sort((a, b) =>
              (a.episode.airtime || "99:99").localeCompare(
                b.episode.airtime || "99:99",
              ),
            );

          const upcoming = episodes
            .filter(
              ({ episode }) =>
                Boolean(episode.airdate && episode.airdate > now.date),
            )
            .sort((a, b) =>
              (a.episode.airdate || "").localeCompare(b.episode.airdate || ""),
            )
            .slice(0, 3);

          let body = "Nothing from your tracked shows is airing today.";

          if (today.length) {
            body =
              today
                .slice(0, 5)
                .map(
                  ({ show, episode }) =>
                    show.title +
                    (episode.airtime ? " at " + episode.airtime : ""),
                )
                .join(" · ") +
              (today.length > 5 ? " · +" + (today.length - 5) + " more" : "");
          } else if (upcoming.length) {
            body =
              "Next up: " +
              upcoming
                .map(
                  ({ show, episode }) =>
                    show.title + " · " + readableDate(episode.airdate!),
                )
                .join(" · ");
          }

          const sent = await sendToUser(db, preference.user_id, {
            title: today.length ? "What's on today" : "Your TV schedule",
            body,
            url: "/my-shows",
            tag: "daily-" + now.date,
          });

          if (sent > 0) {
            await recordDelivery(
              db,
              preference.user_id,
              deliveryKey,
              "daily",
            );
            result.daily++;
          }
        }
      }

      if (preference.episode_alerts) {
        const alertMinutes = Number(preference.episode_alert_minutes || 0);

        for (const { show, episode } of episodes) {
          if (!episode.airstamp) continue;

          const targetMs =
            new Date(episode.airstamp).getTime() - alertMinutes * 60_000;
          const elapsed = Date.now() - targetMs;

          if (elapsed < 0 || elapsed > 7 * 60_000) continue;

          const deliveryKey =
            "episode:" +
            preference.user_id +
            ":" +
            episode.id +
            ":" +
            alertMinutes;

          if (await alreadyDelivered(db, deliveryKey)) continue;

          const timing =
            alertMinutes === 0
              ? "is airing now"
              : "starts in " + alertMinutes + " min";

          const sent = await sendToUser(db, preference.user_id, {
            title: show.title + " " + timing,
            body:
              "S" +
              episode.season +
              " E" +
              episode.number +
              " · " +
              episode.name,
            url: "/show/" + show.tvmaze_id,
            tag: "episode-" + episode.id + "-" + alertMinutes,
          });

          if (sent > 0) {
            await recordDelivery(
              db,
              preference.user_id,
              deliveryKey,
              "episode",
              episode.id,
            );
            result.episodes++;
          }
        }
      }
    } catch {
      result.skipped++;
    }
  }

  return NextResponse.json({ success: true, ...result });
}
