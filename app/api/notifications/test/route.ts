import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c] || c));
}

export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
  }

  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: pref } = await supabase.from("notification_preferences").select("days_ahead,notification_email").eq("user_id", user.id).maybeSingle();
  const { data: tracked } = await supabase.from("tracked_shows").select("show:shows(id,title,tvmaze_id)").eq("user_id", user.id);
  const shows = (tracked || []).map((row: any) => row.show).filter(Boolean);
  if (!shows.length) return NextResponse.json({ error: "Track at least one show before sending a test email." }, { status: 400 });

  const today = new Date().toLocaleDateString("en-CA");
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + Math.max(1, Math.min(14, pref?.days_ahead || 7)));
  const horizonKey = horizon.toLocaleDateString("en-CA");
  const items: Array<{ show: any; episode: any }> = [];

  await Promise.all(shows.map(async (show: any) => {
    try {
      const r = await fetch("https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes", { next: { revalidate: 3600 } });
      if (!r.ok) return;
      const data = await r.json();
      for (const episode of (data._embedded?.episodes || [])) {
        if (episode.airdate && episode.airdate >= today && episode.airdate <= horizonKey) items.push({ show, episode });
      }
    } catch {}
  }));

  const byDate = new Map<string, Array<{ show: any; episode: any }>>();
  for (const item of items) {
    const list = byDate.get(item.episode.airdate) || [];
    list.push(item);
    byDate.set(item.episode.airdate, list);
  }

  const todayItems = byDate.get(today) || [];
  const todayHtml = todayItems.length
    ? "<h2>Today</h2><ul>" + todayItems.map(({ show, episode }) => "<li><strong>" + escapeHtml(episode.airtime || "Time TBA") + "</strong> — " + escapeHtml(show.title) + " — " + escapeHtml(episode.name) + " (S" + episode.season + " E" + episode.number + ")</li>").join("") + "</ul>"
    : "<h2>Today</h2><p>Nothing from your tracked shows is airing today.</p>";

  const upcomingHtml = Array.from(byDate.keys()).sort().filter((d) => d !== today).map((date) =>
    "<h3>" + formatDate(date) + "</h3><ul>" +
    (byDate.get(date) || []).map(({ show, episode }) => "<li><strong>" + escapeHtml(episode.airtime || "Time TBA") + "</strong> — " + escapeHtml(show.title) + " — " + escapeHtml(episode.name) + " (S" + episode.season + " E" + episode.number + ")</li>").join("") +
    "</ul>"
  ).join("");

  const html = '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#151820;max-width:680px;margin:0 auto;padding:32px 20px">' +
    '<div style="font-weight:800;letter-spacing:2px;color:#f59e0b">SHOW TRACKER</div><h1>Your test roundup</h1><p style="color:#68707e">' + formatDate(today) + '</p>' +
    todayHtml + (upcomingHtml ? "<h2>Coming up</h2>" + upcomingHtml : "<h2>Coming up</h2><p>No upcoming episodes in your selected window.</p>") +
    '<p style="margin-top:32px;color:#68707e;font-size:13px">This is a test email from Show Tracker.</p></body></html>';

  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: pref?.notification_email || user.email!,
    subject: "Show Tracker test email",
    html
  });

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 502 });
  return NextResponse.json({ success: true, email: pref?.notification_email || user.email });
}
