import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, pushConfigured } from "@/lib/push";

type Show = { title: string; tvmaze_id: number; poster_url?: string | null };
type Episode = { id: number; name: string; season: number; number: number; airdate?: string; airtime?: string | null; airstamp?: string | null };

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "UTC",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { date: get("year") + "-" + get("month") + "-" + get("day"), hour: Number(get("hour")), minute: Number(get("minute")) };
}

function minutesOfDay(hour: number, minute: number) { return hour * 60 + minute; }

async function alreadyDelivered(supabase: any, key: string) {
  const { data } = await supabase.from("notification_deliveries").select("id").eq("delivery_key", key).maybeSingle();
  return !!data;
}

async function markDelivered(supabase: any, userId: string, key: string, kind: string, episodeId?: number) {
  await supabase.from("notification_deliveries").insert({ user_id: userId, delivery_key: key, kind, episode_id: episodeId || null });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!pushConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Push service is not configured." }, { status: 503 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("user_id,daily_push,episode_alerts,episode_alert_minutes,days_ahead,email_time_local")
    .or("daily_push.eq.true,episode_alerts.eq.true");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = { daily: 0, episode: 0, skipped: 0, failed: 0 };

  for (const pref of prefs || []) {
    const { data: profile } = await supabase.from("profiles").select("timezone").eq("id", pref.user_id).maybeSingle();
    const timezone = profile?.timezone || "UTC";
    const now = new Date();
    const nowLocal = localParts(now, timezone);
    const localMinute = minutesOfDay(nowLocal.hour, nowLocal.minute);

    const { data: tracked } = await supabase
      .from("tracked_shows")
      .select("show:shows(title,tvmaze_id,poster_url)")
      .eq("user_id", pref.user_id);
    const shows = (tracked || []).map((row: any) => row.show).filter(Boolean) as Show[];
    if (!shows.length) { result.skipped++; continue; }

    const episodes: Array<{ show: Show; episode: Episode }> = [];
    await Promise.all(shows.map(async (show) => {
      try {
        const response = await fetch("https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes");
        if (!response.ok) return;
        const data = await response.json();
        for (const episode of (data._embedded?.episodes || []) as Episode[]) {
          if (episode.airdate) episodes.push({ show, episode });
        }
      } catch {}
    }));

    if (pref.daily_push) {
      const desired = String(pref.email_time_local || "08:00:00").slice(0, 5);
      const [hour, minute] = desired.split(":").map(Number);
      const withinWindow = Math.abs(localMinute - minutesOfDay(hour, minute)) <= 2;
      const dailyKey = "daily:" + pref.user_id + ":" + nowLocal.date;
      if (withinWindow && !(await alreadyDelivered(supabase, dailyKey))) {
        const today = episodes.filter(({ episode }) => episode.airdate === nowLocal.date)
          .sort((a, b) => (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99"));
        const upcoming = episodes.filter(({ episode }) => episode.airdate && episode.airdate >= nowLocal.date)
          .sort((a, b) => (a.episode.airdate || "").localeCompare(b.episode.airdate || "") || (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99"))
          .slice(0, Math.max(5, Math.min(10, Number(pref.days_ahead || 7))));

        const body = today.length
          ? "Today: " + today.slice(0, 4).map(({ show, episode }) => show.title + (episode.airtime ? " " + episode.airtime : "")).join(" · ")
          : upcoming.length
            ? "Next up: " + upcoming.slice(0, 3).map(({ show, episode }) => show.title + " " + episode.airdate).join(" · ")
            : "Nothing from your tracked shows is scheduled today.";

        const { data: subs } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", pref.user_id);
        let sent = false;
        for (const sub of subs || []) {
          try { await sendWebPush(sub, { title: "What’s on today", body, url: "/today", tag: "daily-" + nowLocal.date }); sent = true; }
          catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
        if (sent) { await markDelivered(supabase, pref.user_id, dailyKey, "daily"); result.daily++; }
      }
    }

    if (pref.episode_alerts) {
      const alertMinutes = Number(pref.episode_alert_minutes || 0);
      for (const { show, episode } of episodes) {
        if (!episode.airstamp) continue;
        const air = new Date(episode.airstamp);
        const target = new Date(air.getTime() - alertMinutes * 60000);
        const diff = now.getTime() - target.getTime();
        if (diff < 0 || diff > 5 * 60000) continue;

        const key = "episode:" + pref.user_id + ":" + episode.id + ":" + alertMinutes;
        if (await alreadyDelivered(supabase, key)) continue;
        const { data: subs } = await supabase.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", pref.user_id);
        let sent = false;
        const timing = alertMinutes === 0 ? "is airing now" : "starts in " + alertMinutes + " min";
        for (const sub of subs || []) {
          try {
            await sendWebPush(sub, {
              title: show.title + " " + timing,
              body: "S" + episode.season + " E" + episode.number + " · " + episode.name,
              url: "/show/" + show.tvmaze_id,
              tag: "episode-" + episode.id,
            });
            sent = true;
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
        if (sent) { await markDelivered(supabase, pref.user_id, key, "episode", episode.id); result.episode++; }
      }
    }
  }

  return NextResponse.json(result);
}
