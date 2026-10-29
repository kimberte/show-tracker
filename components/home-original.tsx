"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";
import TvBotLoader from "@/components/tv-bot-loader";
import { getSupabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

type Show = {
  id: number;
  name: string;
  premiered?: string | null;
  image?: { medium?: string; original?: string } | null;
  network?: { name?: string; country?: { name?: string } | null } | null;
  webChannel?: { name?: string; country?: { name?: string } | null } | null;
  status?: string | null;
  summary?: string | null;
  language?: string | null;
  _nextAirdate?: string;
  _nextAirtime?: string | null;
  _nextEpisode?: { name?: string; season?: number; number?: number };
  _isNew?: boolean;
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
  const searchRequest = useRef(0);
  const searchController = useRef<AbortController | null>(null);
  const [results, setResults] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [today, setToday] = useState<TodayItem[]>([]);
  const [upcoming, setUpcoming] = useState<TodayItem[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [heroShows, setHeroShows] = useState<Show[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroTouchStart, setHeroTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [visibleResults, setVisibleResults] = useState(10);

  useEffect(() => {
    fetch("/api/new-and-upcoming")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const eligible = (Array.isArray(data) ? data : []).filter((show: Show) => {
          const country = show.network?.country?.name || show.webChannel?.country?.name || "";
          return show.language === "English" && ["United States", "Canada"].includes(country);
        });
        setHeroShows(eligible.slice(0, 10));
      })
      .catch(() => setHeroShows([]))
      .finally(() => setHeroLoading(false));
  }, []);

  useEffect(() => {
    if (heroShows.length < 2) return;
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % heroShows.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [heroShows.length]);

  useEffect(() => {
    async function loadToday() {
      try {
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

      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const found: TodayItem[] = [];
      const nextFound: TodayItem[] = [];

      await Promise.all(
        ((data || []) as any[]).map(async (item) => {
          const show = item.show;
          if (!show) return;

          try {
            const r = await fetch(
              "https://api.tvmaze.com/shows/" +
                show.tvmaze_id +
                "?embed[]=episodes",
              { signal: AbortSignal.timeout(8000) }
            );
            if (!r.ok) return;

            const s = await r.json();

            const episodes = s._embedded?.episodes || [];
            for (const e of episodes) {
              const item = {
                showId: show.tvmaze_id,
                showName: show.title,
                poster: show.poster_url || s.image?.medium || s.image?.original || null,
                episode: e,
              };
              if (e.airdate === date) found.push(item);
            }
            const nextEpisode = episodes
              .filter((e: any) => e.airdate && e.airdate > date)
              .sort((a: any, b: any) => (a.airdate + (a.airtime || "99:99")).localeCompare(b.airdate + (b.airtime || "99:99")))[0];
            if (nextEpisode) {
              nextFound.push({
                showId: show.tvmaze_id,
                showName: show.title,
                poster: show.poster_url || s.image?.medium || s.image?.original || null,
                episode: nextEpisode,
              });
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
      nextFound.sort((a, b) => (a.episode.airdate + (a.episode.airtime || "99:99")).localeCompare(b.episode.airdate + (b.episode.airtime || "99:99")));
      setUpcoming(nextFound.slice(0, 10));
      } catch (error) {
        console.error("Unable to load today’s schedule:", error);
        setToday([]);
        setUpcoming([]);
      } finally {
        setTodayLoading(false);
      }
    }

    loadToday();
  }, []);

  async function search(queryInput: string = q) {
    const query = queryInput.trim();
    const requestId = ++searchRequest.current;
    searchController.current?.abort();
    if (query.length < 2) {
      setLoading(false);
      setSearched(false);
      setSearchError("");
      setResults([]);
      return;
    }
    const controller = new AbortController();
    searchController.current = controller;
    setLoading(true);
    setSearchError("");
    setSearched(true);
    setVisibleResults(10);
    try {
      const r = await fetch("/api/search?q=" + encodeURIComponent(query), {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      });
      const data = await r.json().catch(() => null);
      if (requestId !== searchRequest.current) return;
      if (!r.ok) {
        setResults([]);
        setSearchError(typeof data?.error === "string" ? data.error : "Search is temporarily unavailable.");
      } else if (Array.isArray(data)) {
        setResults(data);
      } else {
        setResults([]);
        setSearchError("Could not read search results.");
      }
    } catch (error) {
      if (requestId !== searchRequest.current || controller.signal.aborted) return;
      setResults([]);
      setSearchError("Search is temporarily unavailable. Please try again.");
    } finally {
      if (requestId === searchRequest.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (q.trim().length < 2) {
      searchRequest.current++;
      searchController.current?.abort();
      setResults([]);
      setLoading(false);
      setSearched(false);
      setSearchError("");
      return;
    }
    const timer = window.setTimeout(() => { void search(q); }, 300);
    return () => window.clearTimeout(timer);
    // Search is intentionally triggered by changes to the query only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

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

      {heroLoading && <div className="panel" style={{minHeight:260,display:"grid",placeItems:"center",marginBottom:24}}><TvBotLoader label="Getting the spotlight ready…"/></div>}
      {heroShows.length > 0 && (
        <section
          className="home-featured-slider"
          aria-label="Featured new and upcoming shows"
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            setHeroTouchStart({ x: touch.clientX, y: touch.clientY });
          }}
          onTouchEnd={(event) => {
            if (!heroTouchStart) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - heroTouchStart.x;
            const deltaY = touch.clientY - heroTouchStart.y;
            if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
              setHeroIndex((index) => deltaX < 0
                ? (index + 1) % heroShows.length
                : (index - 1 + heroShows.length) % heroShows.length);
            }
            setHeroTouchStart(null);
          }}
        >
          {heroShows.map((show, index) => (
            <article
              key={show.id}
              className={"home-feature-slide" + (index === heroIndex ? " active" : "")}
              style={{ backgroundImage: `linear-gradient(90deg, rgba(7,9,13,.97) 0%, rgba(7,9,13,.8) 44%, rgba(7,9,13,.2) 100%), linear-gradient(0deg, rgba(7,9,13,.75), transparent 55%), url("${show.image?.original || show.image?.medium || ""}")` }}
              aria-hidden={index !== heroIndex}
            >
              <div className="home-feature-copy">
                <div className="accent eyebrow">{show._isNew ? "NEW SERIES" : "COMING BACK SOON"}</div>
                <h2>{show.name}</h2>
                <p className="home-feature-meta">{show.network?.name || show.webChannel?.name || "TV"}{show.premiered ? " · " + show.premiered.slice(0, 4) : ""}</p>
                {show._nextAirdate && <p className="accent home-feature-date">Next episode · {formatDate(show._nextAirdate)}{show._nextAirtime ? " · " + formatTime(show._nextAirtime) : ""}</p>}
                {show.summary && <p className="home-feature-summary muted">{show.summary.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").slice(0, 190)}…</p>}
                <div className="home-feature-actions">
                  <TrackButton showId={show.id} title={show.name} compact />
                  <Link href={"/show/" + show.id} className="nav-pill home-feature-view">Show details</Link>
                </div>
              </div>
            </article>
          ))}
          <div className="home-feature-controls">
            <span className="muted">FEATURED · {heroIndex + 1} / {heroShows.length}</span>
            <div>
              <button type="button" aria-label="Previous featured show" onClick={() => setHeroIndex((i) => (i - 1 + heroShows.length) % heroShows.length)}>‹</button>
              <button type="button" aria-label="Next featured show" onClick={() => setHeroIndex((i) => (i + 1) % heroShows.length)}>›</button>
            </div>
          </div>
        </section>
      )}



      
      <section className="home-search panel">
        <div className="home-search-copy">
          <div className="accent eyebrow">FIND A SHOW</div>
          <h2>What do you want to watch?</h2>
          <p className="muted">Search shows, past and present.</p>
        </div>

        <form
          className="home-search-row"
            onSubmit={(e) => {
              e.preventDefault();
              void search(q);
            }}
          >
            <input
              value={q}
              onChange={(e) => { searchRequest.current++; searchController.current?.abort(); setLoading(false); setResults([]); setQ(e.target.value); }}
              placeholder="Search TV shows..."
              aria-label="Search TV shows"
              autoComplete="off"
            />
            <button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
        </form>
        {loading && <div style={{marginTop:14}}><TvBotLoader label="Finding matching shows…"/></div>}
        {searchError && <p className="muted home-search-error">{searchError}</p>}
        {searched && q.trim().length >= 2 && !searchError && !loading && results.length === 0 && (
          <div className="home-search-empty">
            <h3>No shows found</h3>
            <p className="muted">Try a shorter title or a different spelling.</p>
          </div>
        )}
      </section>

      {!loading && results.length > 0 && (
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


      <section className="home-rail-section home-today">
        <div className="section-heading">
          <div>
            <div className="accent eyebrow home-eyebrow">YOUR TV SCHEDULE</div>
            <h2>What’s on today</h2>
            <p className="muted">{formatDate(new Date().toLocaleDateString("en-CA"))} · Tracked shows only</p>
          </div>
          <Link href="/today" className="accent">See all →</Link>
        </div>
        {todayLoading ? <p className="muted">Loading today’s schedule…</p> : today.length === 0 ? (
          <div className="home-rail-empty panel"><p className="muted">No tracked episodes airing today.</p><Link href="/my-shows" className="accent">Manage My Shows →</Link></div>
        ) : (
          <div className="home-poster-rail">
            {today.map((item) => (
              <Link key={item.showId + "-" + item.episode.id} href={"/show/" + item.showId} className="home-poster-card">
                {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <div className="home-poster-fallback">{item.showName.slice(0, 1)}</div>}
                <div className="home-poster-info">
                  <h3>{item.showName}</h3>
                  <p className="accent">{formatTime(item.episode.airtime)}</p>
                  <p className="muted">{item.episode.name} · S{item.episode.season} E{item.episode.number}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-rail-section home-upcoming-rail">
        <div className="section-heading">
          <div>
            <div className="accent eyebrow home-eyebrow">PLAN AHEAD</div>
            <h2>Upcoming on your shows</h2>
            <p className="muted">The next scheduled episode for each tracked show.</p>
          </div>
          <Link href="/upcoming" className="accent">Full schedule →</Link>
        </div>
        {todayLoading ? <p className="muted">Loading upcoming episodes…</p> : upcoming.length === 0 ? (
          <div className="home-rail-empty panel"><p className="muted">No future episodes are listed for your tracked shows yet.</p><Link href="/discover" className="accent">Discover shows →</Link></div>
        ) : (
          <div className="home-poster-rail">
            {upcoming.map((item) => (
              <Link key={item.showId + "-" + item.episode.id} href={"/show/" + item.showId} className="home-poster-card">
                {item.poster ? <img src={item.poster} alt="" loading="lazy" /> : <div className="home-poster-fallback">{item.showName.slice(0, 1)}</div>}
                <div className="home-poster-info">
                  <h3>{item.showName}</h3>
                  <p className="accent">{formatDate(item.episode.airdate)}{item.episode.airtime ? " · " + formatTime(item.episode.airtime) : ""}</p>
                  <p className="muted">{item.episode.name} · S{item.episode.season} E{item.episode.number}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="home-priority-feature home-alerts-feature panel">
        <div>
          <div className="accent eyebrow">DAILY TV ALERTS</div>
          <h2>Your TV schedule, delivered daily</h2>
          <p className="muted">Get a personal daily roundup of what’s airing today and what’s coming next.</p>
        </div>
        <Link href="/settings/notifications" className="primary-button">Set up daily alerts →</Link>
      </section>

      <section className="home-tools-section">
        <div className="section-heading">
          <div>
            <div className="accent eyebrow home-eyebrow">EXPLORE</div>
            <h2>TV guide & discovery</h2>
            <p className="muted">Everything else in one place.</p>
          </div>
        </div>
        <div className="home-tools-grid">
          {[
            ["My Shows", "Manage your tracked shows and viewing progress.", "/my-shows", "YOUR LIBRARY"],
            ["Discover", "Browse active shows and find your next favourite.", "/discover", "FIND A SHOW"],
            ["New & Upcoming", "Explore new series and returning favourites.", "/new-and-upcoming", "COMING SOON"],
            ["TV Tonight", "See episodes airing today.", "/tv-tonight", "TV GUIDE"],
            ["TV This Week", "Browse the next seven days of episodes.", "/tv-this-week", "TV GUIDE"],
            ["New Episodes", "Find new episodes across active shows.", "/new-episodes", "TV GUIDE"],
          ].map(([title, description, href, label], index) => (
            <Link
              href={href}
              className="panel home-tool-card"
              key={title}
              style={{ backgroundImage: `linear-gradient(0deg, rgba(8,9,11,.92) 0%, rgba(8,9,11,.52) 58%, rgba(8,9,11,.30) 100%), url("${heroShows[index % Math.max(heroShows.length, 1)]?.image?.original || heroShows[index % Math.max(heroShows.length, 1)]?.image?.medium || "/my-tv-tracker-hero.svg"}")` }}
            >
              <div className="accent eyebrow">{label}</div>
              <h3>{title}</h3>
              <p className="muted">{description}</p>
              <span className="accent">Explore →</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}