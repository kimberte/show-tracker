import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, pushConfigured } from "@/lib/push";

type Show = { title: string; tvmaze_id: number };
type Episode = { id: number; name: string; season: number; number: number; airdate?: string | null; airtime?: string | null; airstamp?: string | null };

function localNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { date: get("year") + "-" + get("month") + "-" + get("day"), hour: Number(get("hour")), minute: Number(get("minute")) };
}

function minutes(hour: number, minute: number) { return hour * 60 + minute; }
function inWindow(now: number, target: number) {
  const distance = Math.abs(now - target);
  return distance <= 2 || distance >= 1438;
}

async function delivered(db: any, key: string) {
  const { data } = await db.from("notification_deliveries").select("id").eq("delivery_key", key).maybeSingle();
  return Boolean(data);
}

async function record(db: any, userId: string, key: string, kind: string, episodeId?: number) {
  await db.from("notification_deliveries").insert({ user_id: userId, delivery_key: key, kind, episode_id: episodeId ?? null });
}

async function sendToUser(db: any, userId: string, payload: object) {
  const { data: subscriptions } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", userId);
  let sent = 0;
  for (const subscription of subscriptions || []) {
    try {
      await sendWebPush(subscription, payload);
      sent++;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await db.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
      }
    }
  }
  return sent;
}

async function getEpisodes(shows: Show[]) {
  const all: Array<{ show: Show; episode: Episode }> = [];
  await Promise.all(shows.map(async (show) => {
    try {
      const response = await fetch("https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      for (const episode of (data._embedded?.episodes || []) as Episode[]) {
        if (episode.airdate) all.push({ show, episode });
      }
    } catch {}
  }));
  return all;
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Push service is not configured." }, { status: 503 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: prefs, error } = await db.from("notification_preferences")
    .select("user_id,daily_push,episode_alerts,episode_alert_minutes,email_time_local,push_time_local")
    .or("daily_push.eq.true,episode_alerts.eq.true");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = { daily: 0, episodes: 0, skipped: 0 };

  for (const pref of prefs || []) {
    const { data: profile } = await db.from("profiles").select("timezone").eq("id", pref.user_id).maybeSingle();
    const now = localNow(profile?.timezone || "UTC");
    const { data: tracked } = await db.from("tracked_shows").select("show:shows(title,tvmaze_id)").eq("user_id", pref.user_id);
    const shows = (tracked || []).map((row: any) => row.show).filter(Boolean) as Show[];
    if (!shows.length) { result.skipped++; continue; }

    const episodes = await getEpisodes(shows);

    if (pref.daily_push) {
      const time = String(pref.push_time_local || "08:00").slice(0, 5).split(":").map(Number);
      const key = "daily:" + pref.user_id + ":" + now.date;
      if (inWindow(minutes(now.hour, now.minute), minutes(time[0], time[1])) && !(await delivered(db, key))) {
        const today = episodes.filter(({ episode }) => episode.airdate === now.date).sort((a, b) => (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99"));
        const upcoming = episodes.filter(({ episode }) => Boolean(episode.airdate && episode.airdate > now.date)).sort((a, b) => (a.episode.airdate || "").localeCompare(b.episode.airdate || "")).slice(0, 3);
        const body = today.length
          ? today.slice(0, 5).map(({ show, episode }) => show.title + (episode.airtime ? " at " + episode.airtime : "")).join(" · ")
          : upcoming.length
            ? "Next up: " + upcoming.map(({ show, episode }) => show.title + " " + episode.airdate).join(" · ")
            : "Nothing from your tracked shows is airing today.";
        const sent = await sendToUser(db, pref.user_id, { title: today.length ? "What's on today" : "Your TV schedule", body, url: "/my-shows", tag: "daily-" + now.date });
        if (sent > 0) { await record(db, pref.user_id, key, "daily"); result.daily++; }
      }
    }

    if (pref.episode_alerts) {
      const alertMinutes = Number(pref.episode_alert_minutes || 0);
      for (const { show, episode } of episodes) {
        if (!episode.airstamp) continue;
        const target = new Date(new Date(episode.airstamp).getTime() - alertMinutes * 60000);
        const difference = Date.now() - target.getTime();
        if (difference < 0 || difference > 5 * 60000) continue;
        const key = "episode:" + pref.user_id + ":" + episode.id + ":" + alertMinutes;
        if (await delivered(db, key)) continue;
        const timing = alertMinutes === 0 ? "is airing now" : "starts in " + alertMinutes + " min";
        const sent = await sendToUser(db, pref.user_id, { title: show.title + " " + timing, body: "S" + episode.season + " E" + episode.number + " · " + episode.name, url: "/show/" + show.tvmaze_id, tag: "episode-" + episode.id });
        if (sent > 0) { await record(db, pref.user_id, key, "episode", episode.id); result.episodes++; }
      }
    }
  }

  return NextResponse.json({ success: true, ...result });
}
