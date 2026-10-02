import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "TV Tonight — New Episodes Airing Today | My TV Tracker",
  description: "See TV shows with new episodes airing today, including episode names, times and networks.",
  alternates: { canonical: "/tv-tonight" },
};

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

  return <main className="shell">
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
          <div className="episode-row"><strong>{e.show.name}</strong><span className="accent">{e.airtime || "Time TBA"}</span></div>
          <div className="muted">S{e.season} E{e.number} — {e.name}{e.show.network?.name ? ` · ${e.show.network.name}` : e.show.webChannel?.name ? ` · ${e.show.webChannel.name}` : ""}</div>
          <Link className="view-link" href={`/show/${e.show.id}`}>View show →</Link>
        </div>
      </article>)}
    </div>
    <section className="seo-cta panel"><h2>Never miss an episode</h2><p className="muted">Track your shows with My TV Tracker and get a daily email with what's airing and what's coming next.</p><Link className="primary-button" href="/">Track your shows</Link></section>
  </main>;
}
