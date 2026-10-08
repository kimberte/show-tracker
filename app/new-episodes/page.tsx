import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "New TV Episodes — What's New This Week | My TV Tracker",
  description: "Find new TV episodes airing this week and discover shows with upcoming episodes.",
  alternates: { canonical: "/new-episodes" },
};

function formatTime(time?: string | null) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return time || "Time TBA";
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

async function getEpisodes() {
  const today = new Date().toLocaleDateString("en-CA");
  const r = await fetch("https://api.tvmaze.com/schedule?date=" + today, { next: { revalidate: 3600 } });
  if (!r.ok) return [];
  return r.json();
}

export default async function NewEpisodesPage() {
  const episodes = (await Promise.all(Array.from({length: 7}, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); const date = d.toLocaleDateString("en-CA"); return fetch("https://api.tvmaze.com/schedule?date=" + date, { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : []).catch(() => []); }))).flat();
  const start = new Date();
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const items = episodes.filter((e:any) => {
    if (!e.airdate || e.show?.status !== "Running") return false;
    const d = new Date(e.airdate + "T12:00:00");
    return d >= start && d < end;
  }).sort((a:any,b:any) => (a.airdate+a.airtime).localeCompare(b.airdate+b.airtime));

  const guideStructuredData = { "@context": "https://schema.org", "@type": "ItemList", name: "New TV Episodes", itemListElement: items.slice(0, 100).map((e: any, i: number) => ({ "@type": "ListItem", position: i + 1, name: e.show.name + " — " + e.name, url: "https://mytvtracker.app/show/" + e.show.id })) };

  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideStructuredData) }} />
    <SiteNav />
    <header className="page-header"><div>
      <div className="accent eyebrow">DISCOVERY</div>
      <h1 className="page-title">New Episodes</h1>
      <p className="muted page-subtitle">New episodes from currently airing shows over the next seven days.</p>
    </div></header>
    <div className="episode-list">{items.slice(0,100).map((e:any)=><article className="panel episode-card episode-card-simple" key={e.id}>
      <div className="episode-card-info"><div className="episode-row"><strong>{e.show.name}</strong><span className="accent">{new Date(e.airdate+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {formatTime(e.airtime)}</span></div><div className="muted">S{e.season} E{e.number} — {e.name}</div><Link className="view-link" href={`/show/${e.show.id}`}>View show →</Link></div>
    </article>)}</div>
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE THE TV GUIDE</div><h2>Find more to watch</h2></div><div className="seo-link-grid"><Link href="/tv-tonight">TV Tonight →</Link><Link href="/tv-this-week">TV This Week →</Link><Link href="/discover">Discover Shows →</Link></div></section>
    <section className="seo-cta panel"><h2>Don't miss what's next</h2><p className="muted">Track your shows and get a daily email with your personalized TV schedule.</p><Link className="primary-button" href="/">Track your shows</Link></section>
  </main>;
}
