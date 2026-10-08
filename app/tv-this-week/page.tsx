import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "TV This Week — New Episodes & Show Schedule | My TV Tracker",
  description: "See new TV episodes airing this week and keep track of what's coming next across your favourite shows.",
  alternates: { canonical: "/tv-this-week" },
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

function dateKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
}

export default async function TvThisWeekPage() {
  const episodes = (await Promise.all(Array.from({length: 7}, (_, i) => fetch("https://api.tvmaze.com/schedule?date=" + dateKey(i), { next: { revalidate: 3600 } }).then(r => r.ok ? r.json() : []).catch(() => [])))).flat();
  const dates = Array.from({length: 7}, (_, i) => dateKey(i));
  const groups = dates.map(date => ({
    date,
    items: episodes.filter((e: any) => e.airdate === date && ["Running", "In Development"].includes(e.show?.status)).sort((a: any,b: any)=>(a.airtime||"").localeCompare(b.airtime||""))
  })).filter(g => g.items.length);

  const guideStructuredData = { "@context": "https://schema.org", "@type": "ItemList", name: "TV This Week", itemListElement: episodes.filter((e: any) => ["Running", "In Development"].includes(e.show?.status)).slice(0, 100).map((e: any, i: number) => ({ "@type": "ListItem", position: i + 1, name: e.show.name + " — " + e.name, url: "https://mytvtracker.app/show/" + e.show.id })) };

  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideStructuredData) }} />
    <SiteNav />
    <header className="page-header"><div>
      <div className="accent eyebrow">TV SCHEDULE</div>
      <h1 className="page-title">TV This Week</h1>
      <p className="muted page-subtitle">A simple schedule of new episodes airing over the next seven days.</p>
    </div></header>
    {groups.map(group => <section className="show-section" key={group.date}>
      <div className="section-heading"><h2>{new Date(group.date + "T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</h2><span className="muted">{group.items.length} episode{group.items.length === 1 ? "" : "s"}</span></div>
      <div className="episode-list">{group.items.slice(0, 50).map((e:any)=><article className="panel episode-card episode-card-simple" key={e.id}>
        <div className="episode-card-info"><div className="episode-row"><strong>{e.show.name}</strong><span className="accent">{formatTime(e.airtime)}</span></div><div className="muted">S{e.season} E{e.number} — {e.name}</div><Link className="view-link" href={`/show/${e.show.id}`}>View show →</Link></div>
      </article>)}</div>
    </section>)}
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE THE TV GUIDE</div><h2>Keep browsing</h2></div><div className="seo-link-grid"><Link href="/tv-tonight">TV Tonight →</Link><Link href="/new-episodes">New Episodes →</Link><Link href="/discover">Discover Shows →</Link></div></section>
    <section className="seo-cta panel"><h2>Keep your TV schedule in one place</h2><p className="muted">Track the shows you care about and let My TV Tracker keep you updated with a daily email.</p><Link className="primary-button" href="/">Start tracking</Link></section>
  </main>;
}
