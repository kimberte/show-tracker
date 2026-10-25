import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const metadata: Metadata = {
  title: "TV Tracking Guides",
  description: "Practical guides to following TV premieres, keeping track of episodes and building a personal TV schedule.",
  alternates: { canonical: "/guides" },
};

const guides = [
  { title: "How to keep track of the TV shows you watch", id: "track-shows", body: ["Start with a list of shows you actively follow, rather than every series you have ever watched. This keeps upcoming schedules useful and reduces unnecessary alerts.", "Check each show's next scheduled episode before planning a viewing night. A missing date does not necessarily mean a show has ended: networks and streaming services sometimes announce schedules late.", "Mark episodes as watched as you finish them. For long-running series, work through seasons in order and review your outstanding episodes periodically."] },
  { title: "How to plan your TV viewing week", id: "weekly-schedule", body: ["Look at the next seven days first. Separate premieres, regularly scheduled episodes and shows without a confirmed airdate.", "Remember that an episode's listed airtime may use the broadcaster's local timezone. Streaming release times and regional availability can differ.", "Use a personal watchlist to focus on shows you actually follow. A public TV guide is useful for discovery, but your tracked schedule is better for deciding what to watch."] },
  { title: "Why a new episode may not appear in your schedule", id: "missing-episodes", body: ["Episode listings depend on publicly available scheduling information. Networks can postpone broadcasts, and streaming services may not publish individual episode times in advance.", "Check whether the series is on hiatus, whether the episode has a confirmed airdate and whether your region carries the same release schedule.", "If the show is tracked but still missing, revisit its show page later. Schedule updates can arrive after an initial announcement."] },
];

export default function GuidesPage() {
  return <main className="shell">
    <SiteNav />
    <header className="page-header"><div><div className="accent eyebrow">WATCH SMARTER</div><h1 className="page-title">TV Tracking Guides</h1><p className="muted page-subtitle">Practical advice for keeping up with new episodes, premieres and your watchlist.</p></div></header>
    <section className="seo-intro panel"><h2>Make your TV schedule work for you</h2><p className="muted">A TV schedule is only useful when you can tell what is airing, what you have already watched and what has not yet been announced. These guides explain how to manage all three.</p></section>
    {guides.map(g => <article className="panel" key={g.id} id={g.id} style={{marginTop: "1.25rem", padding: "1.5rem"}}><h2>{g.title}</h2>{g.body.map(p => <p className="muted" key={p}>{p}</p>)}</article>)}
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE</div><h2>Find your next episode</h2></div><div className="seo-link-grid"><Link href="/tv-tonight">TV Tonight →</Link><Link href="/tv-this-week">TV This Week →</Link><Link href="/new-and-upcoming">New & Upcoming →</Link><Link href="/discover">Discover Shows →</Link></div></section>
    <section className="seo-cta panel"><h2>Build your personal TV schedule</h2><p className="muted">Track the shows you care about, check upcoming episodes and keep your viewing progress in one place.</p><Link className="primary-button" href="/">Start tracking shows</Link></section>
  </main>;
}
