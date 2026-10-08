"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";
import { getSupabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

type Show = {
  id: number;
  name: string;
  premiered?: string | null;
  image?: { medium?: string } | null;
  network?: { name: string } | null;
  webChannel?: { name: string } | null;
  status?: string | null;
};

type TodayItem = {
  showId: number;
  showName: string;
  poster?: string | null;
  episode: any;
};

function formatTime(value?: string | null) {
  if (!value) return "Time TBA";
  const [hour, minute] = value.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value;
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Home() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [today, setToday] = useState<TodayItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [visibleResults, setVisibleResults] = useState(10);

  useEffect(() => {
    async function loadToday() {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTodayLoading(false);
        return;
      }

      const { data } = await supabase
        .from("tracked_shows")
        .select("show:shows(tvmaze_id,title,poster_url)");

      const date = new Date().toLocaleDateString("en-CA");
      const found: TodayItem[] = [];

      await Promise.all(
        ((data || []) as any[]).map(async (item) => {
          const show = item.show;
          if (!show) return;

          try {
            const r = await fetch(
              "https://api.tvmaze.com/shows/" +
                show.tvmaze_id +
                "?embed[]=episodes"
            );
            if (!r.ok) return;

            const s = await r.json();

            for (const e of s._embedded?.episodes || []) {
              if (e.airdate === date) {
                found.push({
                  showId: show.tvmaze_id,
                  showName: show.title,
                  poster: show.poster_url || s.image?.medium || s.image?.original || null,
                  episode: e,
                });
              }
            }
          } catch {}
        })
      );

      found.sort((a, b) =>
        (a.episode.airtime || "99:99").localeCompare(
          b.episode.airtime || "99:99"
        )
      );

      setToday(found);
      setTodayLoading(false);
    }

    loadToday();
  }, []);

  async function search() {
    if (!q.trim()) return;

    setLoading(true);
    setSearched(true);
    trackEvent("search", { search_term: q.trim() });
    setVisibleResults(10);

    try {
      const r = await fetch("/api/search?q=" + encodeURIComponent(q));
      if (!r.ok) {
        setResults([]);
        return;
      }

      const data = await r.json();
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  const homeStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "My TV Tracker",
    url: "https://www.mytvtracker.app/",
    description:
      "Track your favourite TV shows, see what's airing today, discover what's coming next, and get a personal daily TV schedule.",
  };

  return (
    <main className="shell home-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <SiteNav />

      <header className="home-hero">
        <div className="home-hero-copy">
          <div className="accent home-brand">MY TV TRACKER</div>
          <h1 className="hero-title home-title">
            Never miss
            <br />
            when your shows are on.
          </h1>
          <p className="muted">Track your shows. See what’s airing. Know what to watch.</p>
          <div className="home-hero-benefit">
            <div className="accent eyebrow">DAILY TV ALERTS</div>
            <strong>Get your personal TV schedule delivered every day.</strong>
            <span className="muted">Know what’s airing today and what’s coming next without having to remember.</span>
            <Link href="/settings/notifications" className="accent">Set up daily alerts →</Link>
            <span className="muted home-hero-note">Free to use · sign in only when you track a show</span>
          </div>
        </div>
        <div className="home-hero-visual" aria-hidden="true">
          <img src="/my-tv-tracker-hero.svg" alt="" />
        </div>
      </header>

      
      <section className="home-search panel">
        <div className="home-search-copy">
          <div className="accent eyebrow">FIND A SHOW</div>
          <h2>What do you want to watch?</h2>
          <p className="muted">Search active shows and add them to your tracker.</p>
        </div>

        <form
          className="home-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search TV shows..."
              aria-label="Search TV shows"
              autoComplete="off"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
        </form>
        {searched && !loading && results.length === 0 && (
          <div className="home-search-empty">
            <h3>No active or upcoming shows found</h3>
            <p className="muted">Try another title. We include currently airing shows and shows with announced upcoming episodes.</p>
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section className="home-results" aria-live="polite">
          <div className="section-heading">
            <h2>Search results</h2>
            <span className="muted">{results.length} found</span>
          </div>

          <div className="home-results-list">
            {results.slice(0, visibleResults).map((s) => (
              <div key={s.id} className="panel home-result-card">
                {s.image?.medium && (
                  <Link href={"/show/" + s.id} aria-label={"View " + s.name}>
                    <img src={s.image.medium} width="70" height="95" alt="" />
                  </Link>
                )}

                <div className="home-result-info">
                  <h3>{s.name}</h3>
                  <p className="muted">
                    {s.network?.name || s.webChannel?.name || "TV"}
                    {s.premiered ? " · " + s.premiered.slice(0, 4) : ""}
                  </p>
                  {s.status && s.status !== "Running" && (
                    <div className="accent home-result-status">
                      {s.status === "In Development" ? "Premieres soon" : s.status}
                    </div>
                  )}
                </div>

                <div className="home-result-actions">
                  <TrackButton showId={s.id} title={s.name} compact />
                  <Link href={"/show/" + s.id} className="nav-pill home-view-button">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {visibleResults < results.length && (
            <div className="load-more-wrap">
              <button className="nav-pill load-more-button" onClick={() => setVisibleResults((v) => Math.min(v + 10, results.length))}>View more results</button>
            </div>
          )}
        </section>
      )}


      {!todayLoading && today.length > 0 && (
        <section className="home-today">
          <div className="section-heading">
            <div>
              <div className="accent eyebrow home-eyebrow">YOUR TV SCHEDULE</div>
              <h2>What’s on today</h2>
              <p className="muted">{formatDate(new Date().toLocaleDateString("en-CA"))} · Tracked shows only</p>
            </div>
            <Link href="/today" className="accent">See all →</Link>
          </div>

          <div className="today-home-list">
            {today.map((item) => (
              <article
                key={item.showId + "-" + item.episode.id}
                className="panel today-home-card"
              >
                {item.poster && (
                  <Link href={"/show/" + item.showId} aria-label={"View " + item.showName}>
                    <img src={item.poster} width="64" height="90" alt="" />
                  </Link>
                )}

                <div className="today-home-info">
                  <div className="accent today-home-time">
                    {formatTime(item.episode.airtime)}
                  </div>
                  <h3>{item.showName}</h3>
                  <div className="muted">
                    {item.episode.name} · S{item.episode.season} E{item.episode.number}
                  </div>
                </div>

                <Link href={"/show/" + item.showId} className="accent view-link">
                  View →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="home-discovery-strip">
        <Link href="/new-and-upcoming" className="panel home-discovery-feature">
          <div>
            <div className="accent eyebrow">NEW & UPCOMING</div>
            <h2>Looking for your next show?</h2>
            <p className="muted">Find new series and returning favourites coming soon, then track them before they air.</p>
          </div>
          <span className="accent">Browse new & upcoming →</span>
        </Link>
      </section>

      {true && (
        <>
          <section className="home-quick-grid">
            {[
              ["Upcoming", "See what’s next across your tracked shows.", "/upcoming"],
              ["My Shows", "Manage the shows you’re tracking.", "/my-shows"],
              ["Discover", "Browse more currently active shows.", "/discover"],
            ].map(([title, description, href]) => (
              <Link href={href} className="panel home-quick-card" key={title}>
                <h3>{title}</h3>
                <p className="muted">{description}</p>
                <span className="accent">Open →</span>
              </Link>
            ))}
          </section>
          <section className="home-seo-grid">
            {[
              ["TV Tonight", "See new episodes airing today.", "/tv-tonight"],
              ["TV This Week", "Browse the next seven days of episodes.", "/tv-this-week"],
              ["New Episodes", "Find what’s new across active shows.", "/new-episodes"],
            ].map(([title, description, href]) => (
              <Link href={href} className="panel home-quick-card" key={title}>
                <div className="accent eyebrow">TV GUIDE</div>
                <h3>{title}</h3>
                <p className="muted">{description}</p>
                <span className="accent">Explore →</span>
              </Link>
            ))}
          </section>
        </>
      )}
    </main>
  );
}