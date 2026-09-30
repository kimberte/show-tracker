"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import { getSupabase } from "@/lib/supabase";

type Show = {
  id: number;
  name: string;
  premiered?: string | null;
  image?: { medium?: string } | null;
  network?: { name: string } | null;
  webChannel?: { name: string } | null;
};

type TodayItem = {
  showId: number;
  showName: string;
  poster?: string | null;
  episode: any;
};

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
  const [today, setToday] = useState<TodayItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);

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
                  poster: show.poster_url,
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

  return (
    <main className="shell home-shell">
      <header className="home-nav">
        <div>
          <div className="accent home-brand">SHOW TRACKER</div>
          <h1 className="hero-title home-title">
            Never miss
            <br />
            when your shows are on.
          </h1>
          <p className="muted">Track your shows. See what’s airing. Know what to watch.</p>
        </div>

        <nav className="top-nav home-top-nav">
          <Link className="nav-pill" href="/today">Today</Link>
          <Link className="nav-pill" href="/upcoming">Upcoming</Link>
          <Link className="nav-pill" href="/my-shows">My Shows</Link>
          <Link className="nav-pill" href="/discover">Discover</Link><Link className="nav-pill" href="/settings/notifications">Notifications</Link>
        </nav>
      </header>

      <section className="home-search panel">
        <div className="home-search-copy">
          <div className="accent eyebrow">FIND A SHOW</div>
          <h2>What do you want to watch?</h2>
          <p className="muted">Search active shows and add them to your tracker.</p>
        </div>

        <div className="home-search-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search TV shows..."
            aria-label="Search TV shows"
          />
          <button onClick={search} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </div>
      </section>

      {!todayLoading && today.length > 0 && (
        <section className="home-today">
          <div className="section-heading">
            <div>
              <div className="accent eyebrow home-eyebrow">TODAY</div>
              <h2>What’s on today</h2>
              <p className="muted">{formatDate(new Date().toLocaleDateString("en-CA"))}</p>
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
                  <img src={item.poster} width="52" height="74" alt="" />
                )}

                <div className="today-home-info">
                  <div className="accent today-home-time">
                    {item.episode.airtime || "Time TBA"}
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

      {results.length > 0 && (
        <section className="home-results">
          <div className="section-heading">
            <h2>Search results</h2>
            <span className="muted">{results.length} found</span>
          </div>

          <div className="home-results-list">
            {results.map((s) => (
              <div key={s.id} className="panel home-result-card">
                {s.image?.medium && (
                  <img src={s.image.medium} width="70" height="95" alt="" />
                )}

                <div className="home-result-info">
                  <h3>{s.name}</h3>
                  <p className="muted">
                    {s.network?.name || s.webChannel?.name || "TV"}
                    {s.premiered ? " · " + s.premiered.slice(0, 4) : ""}
                  </p>
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
        </section>
      )}

      {results.length === 0 && (
        <section className="home-quick-grid">
          {[
            ["Upcoming", "See what’s next across your shows.", "/upcoming"],
            ["My Shows", "Manage your personal watch list.", "/my-shows"],
            ["Discover", "Browse more currently active shows.", "/discover"],
          ].map(([title, description, href]) => (
            <Link href={href} className="panel home-quick-card" key={title}>
              <h3>{title}</h3>
              <p className="muted">{description}</p>
              <span className="accent">Open →</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}