import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

type Show = { id: number; title: string; tvmaze_id: number; poster_url?: string | null };
type Episode = { id: number; name: string; season: number; number: number; airdate?: string; airtime?: string | null };

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c] || c));
}

function showImage(show: Show, width = 86, height = 122) {
  if (!show.poster_url) return "";
  return '<img src="' + escapeHtml(show.poster_url) + '" width="' + width + '" height="' + height +
    '" alt="' + escapeHtml(show.title) + ' artwork" style="display:block;width:' + width + "px;height:" +
    height + 'px;object-fit:cover;border-radius:8px;" />';
}

function episodeCard(show: Show, episode: Episode) {
  const image = showImage(show);
  const imageCell = image
    ? '<td width="86" valign="top" style="padding-right:16px;">' + image + "</td>"
    : "";
  const episodeTime = episode.airtime || "Time TBA";
  const showUrl = "https://mytvtracker.app/show/" + show.tvmaze_id;

  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' +
    "<tr>" + imageCell + '<td valign="top" style="padding:2px 0;">' +
    '<div style="font-size:12px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#f59e0b;">' +
    escapeHtml(episodeTime) + "</div>" +
    '<div style="font-size:18px;line-height:1.25;font-weight:800;margin-top:4px;color:#151820;">' +
    '<a href="' + showUrl + '" style="color:#151820;text-decoration:none;">' + escapeHtml(show.title) + "</a></div>" +
    '<div style="font-size:13px;line-height:1.5;color:#68707e;margin-top:4px;">S' + episode.season +
    " E" + episode.number + " · " + escapeHtml(episode.name) + "</div>" +
    "</td></tr></table>";
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Email service is not configured." }, { status: 503 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: prefs, error } = await supabase
    .from("notification_preferences")
    .select("user_id,email_daily,days_ahead,notification_email")
    .eq("email_daily", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { sent: 0, skipped: 0, failed: 0 };

  for (const pref of prefs || []) {
    const { data: authData } = await supabase.auth.admin.getUserById(pref.user_id);
    const email = pref.notification_email || authData.user?.email;
    if (!email) {
      results.skipped++;
      continue;
    }

    const { data: tracked } = await supabase
      .from("tracked_shows")
      .select("show:shows(id,title,tvmaze_id,poster_url)")
      .eq("user_id", pref.user_id);

    const shows = (tracked || []).map((row: any) => row.show).filter(Boolean) as Show[];
    if (!shows.length) {
      results.skipped++;
      continue;
    }

    const today = new Date().toLocaleDateString("en-CA");
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + Math.max(1, Math.min(14, pref.days_ahead || 7)));
    const horizonKey = horizon.toLocaleDateString("en-CA");
    const byDate = new Map<string, Array<{ show: Show; episode: Episode }>>();

    await Promise.all(shows.map(async (show) => {
      try {
        const r = await fetch(
          "https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes",
          { next: { revalidate: 3600 } }
        );
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

    if (!byDate.size) {
      results.skipped++;
      continue;
    }

    const dates = Array.from(byDate.keys()).sort();
    const todayItems = (byDate.get(today) || []).sort((a, b) =>
      (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99")
    );

    const firstItem = todayItems[0] || (byDate.get(dates[0]) || [])[0];
    const heroImage = firstItem ? showImage(firstItem.show, 96, 136) : "";

    const todayHtml = todayItems.length
      ? '<div style="font-size:12px;font-weight:800;letter-spacing:1.4px;color:#f59e0b;text-transform:uppercase;margin-bottom:12px;">Tonight / Today</div>' +
        todayItems.map(({ show, episode }) =>
          '<div style="background:#ffffff;border:1px solid #e7e9ee;border-radius:12px;padding:16px;margin-bottom:10px;">' +
          episodeCard(show, episode) +
          "</div>"
        ).join("")
      : '<div style="background:#ffffff;border:1px solid #e7e9ee;border-radius:12px;padding:18px;color:#68707e;">Nothing from your tracked shows is airing today.</div>';

    const upcomingDates = dates.filter((d) => d !== today);
    const upcomingHtml = upcomingDates.length
      ? '<div style="font-size:12px;font-weight:800;letter-spacing:1.4px;color:#f59e0b;text-transform:uppercase;margin:28px 0 12px;">Coming up</div>' +
        upcomingDates.map((date) =>
          '<div style="font-size:16px;font-weight:800;color:#151820;margin:18px 0 8px;">' + formatDate(date) + "</div>" +
          (byDate.get(date) || []).sort((a, b) =>
            (a.episode.airtime || "99:99").localeCompare(b.episode.airtime || "99:99")
          ).map(({ show, episode }) =>
            '<div style="background:#ffffff;border:1px solid #e7e9ee;border-radius:12px;padding:14px 16px;margin-bottom:8px;">' +
            episodeCard(show, episode) +
            "</div>"
          ).join("")
        ).join("")
      : '<div style="margin-top:28px;background:#ffffff;border:1px solid #e7e9ee;border-radius:12px;padding:16px;color:#68707e;">No upcoming episodes in your selected window.</div>';

    const heroText = firstItem
      ? '<td valign="middle" style="padding-left:18px;">' +
        '<div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#f59e0b;text-transform:uppercase;">Your TV tonight</div>' +
        '<div style="font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-top:6px;">' + escapeHtml(firstItem.show.title) + "</div>" +
        '<div style="font-size:14px;line-height:1.5;color:#c9ced8;margin-top:8px;">' +
        escapeHtml(firstItem.episode.name) + " · " + escapeHtml(firstItem.episode.airtime || "Time TBA") + "</div>" +
        "</td>"
      : '<td valign="middle" style="padding-left:18px;"><div style="font-size:12px;font-weight:800;letter-spacing:1.5px;color:#f59e0b;text-transform:uppercase;">Your TV roundup</div><div style="font-size:28px;line-height:1.15;font-weight:900;color:#ffffff;margin-top:6px;">Stay on top of your shows.</div></td>';

    const hero = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#151820;border-radius:16px;overflow:hidden;">' +
      '<tr>' +
      (heroImage ? '<td width="96" valign="middle" style="padding:18px 0 18px 18px;">' + heroImage + "</td>" : "") +
      heroText +
      "</tr></table>";

    const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"></head>' +
      '<body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#151820;">' +
      '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your personal TV schedule for ' + formatDate(today) + ".</div>" +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr><td align="center" style="padding:28px 12px;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;border-collapse:collapse;">' +
      '<tr><td style="padding:0 4px 14px;"><div style="font-size:12px;font-weight:900;letter-spacing:2px;color:#151820;">MY TV TRACKER <span style="color:#f59e0b;">●</span></div></td></tr>' +
      '<tr><td>' + hero + "</td></tr>" +
      '<tr><td style="padding-top:20px;">' + todayHtml + upcomingHtml + "</td></tr>" +
      '<tr><td style="padding-top:22px;">' +
      '<a href="https://mytvtracker.app/my-shows" style="display:block;text-align:center;background:#f59e0b;color:#151820;text-decoration:none;font-size:14px;font-weight:900;padding:13px 18px;border-radius:9px;">VIEW MY SHOWS</a>' +
      "</td></tr>" +
      '<tr><td style="padding:26px 4px 4px;font-size:12px;line-height:1.6;color:#7a818e;">' +
      "You’re receiving this because daily email notifications are enabled in My TV Tracker." +
      '<br><a href="https://mytvtracker.app/settings/notifications" style="color:#7a818e;">Manage email preferences</a>' +
      ' · <a href="https://mytvtracker.app" style="color:#7a818e;">Open My TV Tracker</a>' +
      "</td></tr></table></td></tr></table></body></html>";

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your TV tonight — " + formatDate(today),
      html,
    });

    if (result.error) results.failed++;
    else results.sent++;
  }

  return NextResponse.json(results);
}