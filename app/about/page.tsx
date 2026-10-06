import Link from "next/link";
import SiteNav from "@/components/site-nav";

export default function AboutPage() {
  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <div className="accent eyebrow">ABOUT MY TV TRACKER</div>
          <h1 className="page-title">Your shows. Your schedule. Your reminders.</h1>
          <p className="muted page-subtitle">
            My TV Tracker is a simple way to keep up with the shows you actually watch — without maintaining a complicated watchlist.
          </p>
        </div>
      </header>
      <div className="utility-grid">
        <section className="panel utility-card">
          <h2>How it works</h2>
          <p className="muted">Search for a show, track it, and we build your personal schedule around it.</p>
          <p className="muted">Use Today and Upcoming to see what’s next, Discover to find something new, and notifications when you want reminders.</p>
        </section>
        <section className="panel utility-card">
          <h2>Built for TV fans</h2>
          <p className="muted">The goal is deliberately simple: help you answer “What’s on?” without digging through a giant TV database.</p>
          <p className="muted">You can use the public TV guide pages without an account. An account is only needed for personal tracking and reminders.</p>
        </section>
      </div>
      <section className="panel utility-card utility-wide">
        <h2>TV data</h2>
        <p className="muted">Show and episode information is provided through TVMaze. Schedules and availability can change as networks and streaming services update their listings.</p>
        <Link href="/faq" className="accent">Read the FAQ →</Link>
      </section>
    </main>
  );
}
