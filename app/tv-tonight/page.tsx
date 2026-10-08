import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "TV Tonight — New Episodes Airing Today | My TV Tracker",
  description: "See TV shows with new episodes airing today, including episode names, times and networks.",
  alternates: { canonical: "/tv-tonight" },
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

export default async function TvTonightPage() {
  const episodes = await getEpisodes();
  const today = new Date().toLocaleDateString("en-CA");
  const items = episodes
    .filter((e: any) => e.airdate === today && ["Running", "In Development"].includes(e.show?.status))
    .sort((a: any, b: any) => (a.airtime || "").localeCompare(b.airtime || ""));

  const guideStructuredData = { "@context": "https://schema.org", "@type": "ItemList", name: "TV Tonight", itemListElement: items.slice(0, 50).map((e: any, i: number) => ({ "@type": "ListItem", position: i + 1, name: e.show.name + " — " + e.name, url: "https://mytvtracker.app/show/" + e.show.id })) };

  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideStructuredData) }} />
    <SiteNav />
    <header className="page-header">
      <div>
        <div className="accent eyebrow">TV SCHEDULE</div>
        <h1 className="page-title">TV Tonight</h1>
        <p className="muted page-subtitle">New episodes airing today, all in one place. Track your favourites and get your personalized schedule by email.</p>
      </div>
    </header>
    <section className="seo-intro panel">
      <strong>What's on tonight?</strong>
      <span className="muted"> {items.length ? `${items.length} new episodes are scheduled today.` : "No new episodes are currently listed for today."}</span>
    </section>
    <div className="episode-list">
      {items.slice(0, 50).map((e: any) => <article className="panel episode-card episode-card-simple" key={e.id}>
        <div className="episode-card-info">
          <div className="episode-row"><strong>{e.show.name}</strong><span className="accent">{formatTime(e.airtime)}</span></div>
          <div className="muted">S{e.season} E{e.number} — {e.name}{e.show.network?.name ? ` · ${e.show.network.name}` : e.show.webChannel?.name ? ` · ${e.show.webChannel.name}` : ""}</div>
          <Link className="view-link" href={`/show/${e.show.id}`}>View show →</Link>
        </div>
      </article>)}
    </div>
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE THE TV GUIDE</div><h2>More ways to find what’s on</h2></div><div className="seo-link-grid"><Link href="/tv-this-week">TV This Week →</Link><Link href="/new-episodes">New Episodes →</Link><Link href="/new-and-upcoming">New & Upcoming →</Link></div></section>
    <section className="seo-cta panel"><h2>Never miss an episode</h2><p className="muted">Track your shows with My TV Tracker and get a daily email with what's airing and what's coming next.</p><Link className="primary-button" href="/">Track your shows</Link></section>
  </main>;
}
