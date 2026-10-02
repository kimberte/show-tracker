import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type Show = { id: number; title: string; tvmaze_id: number; poster_url?: string | null };
type Episode = { id: number; name: string; season: number; number: number; airdate?: string; airtime?: string | null };

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c));
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: prefs, error } = await supabase.from("notification_preferences").select("user_id,email_daily,days_ahead,notification_email").eq("email_daily", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { sent: 0, skipped: 0, failed: 0 };

  for (const pref of prefs || []) {
    const { data: authData } = await supabase.auth.admin.getUserById(pref.user_id);
    const email = pref.notification_email || authData.user?.email;
    if (!email) { results.skipped++; continue; }

    const { data: tracked } = await supabase.from("tracked_shows").select("show:shows(id,title,tvmaze_id,poster_url)").eq("user_id", pref.user_id);
    const shows = (tracked || []).map((row: any) => row.show).filter(Boolean) as Show[];
    if (!shows.length) { results.skipped++; continue; }

    const today = new Date().toLocaleDateString("en-CA");
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + Math.max(1, Math.min(14, pref.days_ahead || 7)));
    const horizonKey = horizon.toLocaleDateString("en-CA");
    const byDate = new Map<string, Array<{ show: Show; episode: Episode }>>();

    await Promise.all(shows.map(async (show) => {
      try {
        const r = await fetch("https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes", { next: { revalidate: 3600 } });
        if (!r.ok) return;
        const data = await r.json();
        for (const episode of (data._embedded?.episodes || []) as Episode[]) {
          if (!episode.airdate || episode.airdate < today || episode.airdate > horizonKey) continue;
          const list = byDate.get(episode.airdate) || [];
          list.push({ show, episode });
          byDate.set(episode.airdate, list);
        }
      } catch {}
    }));

    if (!byDate.size) { results.skipped++; continue; }

    const dates = Array.from(byDate.keys()).sort();
    const todayItems = byDate.get(today) || [];
    const todayHtml = todayItems.length
      ? "<h2>Today</h2><ul>" + todayItems.map(({ show, episode }) => "<li><strong>" + escapeHtml(episode.airtime || "Time TBA") + "</strong> — " + escapeHtml(show.title) + " — " + escapeHtml(episode.name) + " (S" + episode.season + " E" + episode.number + ")</li>").join("") + "</ul>"
      : "<h2>Today</h2><p>Nothing from your tracked shows is airing today.</p>";

    const upcomingHtml = dates.length > 1
      ? "<h2>Coming up</h2>" + dates.filter((d) => d !== today).map((date) => "<h3>" + formatDate(date) + "</h3><ul>" + (byDate.get(date) || []).sort((a,b) => (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99")).map(({ show, episode }) => "<li><strong>" + escapeHtml(episode.airtime || "Time TBA") + "</strong> — " + escapeHtml(show.title) + " — " + escapeHtml(episode.name) + " (S" + episode.season + " E" + episode.number + ")</li>").join("") + "</ul>").join("")
      : "<h2>Coming up</h2><p>No upcoming episodes in your selected window.</p>";

    const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#151820;max-width:680px;margin:0 auto;padding:32px 20px">' +
      '<div style="font-weight:800;letter-spacing:2px;color:#f59e0b">SHOW TRACKER</div><h1 style="margin-bottom:4px">Your TV roundup</h1><p style="color:#68707e;margin-top:0">' + formatDate(today) + '</p>' +
      todayHtml + upcomingHtml + '<p style="margin-top:32px;color:#68707e;font-size:13px">You’re receiving this because daily email notifications are enabled in Show Tracker.</p><p style="color:#68707e;font-size:13px"><a href="https://mytvtracker.app/settings/notifications" style="color:#f59e0b">Manage email preferences</a></p></body></html>';

    const result = await resend.emails.send({ from: process.env.EMAIL_FROM, to: email, subject: "Your Show Tracker roundup — " + formatDate(today), html });
    if (result.error) results.failed++; else results.sent++;
  }

  return NextResponse.json(results);
}