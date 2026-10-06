"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";

type Show = {
  id: number;
  name: string;
  premiered?: string | null;
  status?: string;
  genres?: string[];
  image?: { medium?: string; original?: string } | null;
  network?: { name: string; country?: { name?: string } | null } | null;
  webChannel?: { name: string; country?: { name?: string } | null } | null;
  language?: string | null;
  summary?: string | null;
  _discoverStatus?: string;
  _nextAirdate?: string | null;
  _nextAirtime?: string | null;
};

const featuredPlatforms = ["Netflix","HBO","Max","Apple TV+","Disney+","Prime Video","Hulu","Paramount+"];

const genres = [
  "All",
  "Drama",
  "Comedy",
  "Action",
  "Thriller",
  "Science-Fiction",
  "Crime",
  "Fantasy",
  "Horror",
  "Documentary",
  "Animation",
];

function clean(t: string) {
  return t.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function year(s: Show) {
  return s.premiered?.slice(0, 4) || "";
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Discover() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [genre, setGenre] = useState("All");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("next");
  const [platform, setPlatform] = useState("All");
  const [airing, setAiring] = useState("All");
  const [language, setLanguage] = useState("English");
  const [region, setRegion] = useState("North America");
  const [visible, setVisible] = useState(48);

  useEffect(() => {
    fetch("/api/discover")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load shows.");
        return r.json();
      })
      .then(setShows)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setVisible(48);
  }, [genre, q, sort, platform, airing, language, region]);

  const platforms = useMemo(() => {
    const names = new Set<string>();
    shows.forEach((s) => {
      const name = s.network?.name || s.webChannel?.name;
      if (name) names.add(name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [shows]);

  const featuredPlatformMatches = useMemo(() => featuredPlatforms.map((label) => {
    const exact = platforms.find((name) => name.toLowerCase() === label.toLowerCase());
    const partial = platforms.find((name) => name.toLowerCase().includes(label.toLowerCase()) || label.toLowerCase().includes(name.toLowerCase()));
    return { label, value: exact || partial || label };
  }), [platforms]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    return shows
      .filter((s) => {
        const country = s.network?.country?.name || s.webChannel?.country?.name || "";
        const matchesLanguage =
          language === "All" ||
          (language === "Other" ? !!s.language && s.language !== "English" : s.language === language);
        const matchesRegion =
          region === "All" ||
          (region === "North America"
            ? country === "United States" || country === "Canada"
            : region === "UK & Ireland"
              ? country === "United Kingdom" || country === "Ireland"
              : region === "Australia & New Zealand"
                ? country === "Australia" || country === "New Zealand"
                : !!country && !["United States", "Canada", "United Kingdom", "Ireland", "Australia", "New Zealand"].includes(country));

        return (
          (genre === "All" || s.genres?.includes(genre)) &&
          (platform === "All" || (s.network?.name || s.webChannel?.name) === platform) &&
          (airing === "All" || (airing === "Airing soon" ? !!s._nextAirdate : !s._nextAirdate)) &&
          matchesLanguage &&
          matchesRegion &&
          (!term || s.name.toLowerCase().includes(term) || (s.network?.name || s.webChannel?.name || "").toLowerCase().includes(term))
        );
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "newest") {
          return (b.premiered || "").localeCompare(a.premiered || "");
        }

        return (
          ((a._nextAirdate || "9999-99-99") + (a._nextAirtime || "")).localeCompare(
            (b._nextAirdate || "9999-99-99") + (b._nextAirtime || "")
          )
        );
      });
  }, [shows, genre, q, sort, platform, airing, language, region]);

  const displayed = filtered.slice(0, visible);

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header"><div><Link href="/" className="muted">← My TV Tracker</Link><div className="accent eyebrow">DISCOVER</div><h1 className="page-title">Find your next show.</h1><p className="muted page-subtitle">Browse active and returning shows, see what is airing next, and add favourites straight to your watch list.</p></div></header>

      <section className="discover-controls panel">
        <div className="discover-search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter shows by name…"
            aria-label="Filter shows by name"
          />
          {q && (
            <button className="clear-search" onClick={() => setQ("")}>
              Clear
            </button>
          )}
        </div>

        <div className="discover-platforms">
          <span className="muted">Popular platforms</span>
          <div className="platform-chip-row">
            <button className={"platform-chip " + (platform === "All" ? "active" : "")} onClick={() => setPlatform("All")}>All</button>
            {featuredPlatformMatches.map(({ label, value }) => (
              <button key={label} className={"platform-chip " + (platform === value ? "active" : "")} onClick={() => setPlatform(value)} disabled={!platforms.includes(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="discover-toolbar">
          <label className="discover-platform">
            <span className="muted">Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="English">English</option>
              <option value="All">All languages</option>
              <option value="Other">Other languages</option>
            </select>
          </label>
          <label className="discover-platform">
            <span className="muted">Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="North America">North America</option>
              <option value="All">All regions</option>
              <option value="UK & Ireland">UK & Ireland</option>
              <option value="Australia & New Zealand">Australia & New Zealand</option>
              <option value="Other">Other regions</option>
            </select>
          </label>
        </div>

        <div className="discover-status-tabs">
          {["All", "Airing soon", "Between seasons"].map((value) => (
            <button key={value} className={"genre-chip " + (airing === value ? "active" : "")} onClick={() => setAiring(value)}>{value}</button>
          ))}
        </div>

        <div className="discover-toolbar">
          <label className="discover-platform">
            <span className="muted">Platform / network</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="All">All platforms</option>
              {platforms.map((name) => <option value={name} key={name}>{name}</option>)}
            </select>
          </label>
          <div className="genre-row">
            {genres.map((g) => (
              <button
                key={g}
                className={"genre-chip " + (genre === g ? "active" : "")}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <label className="discover-sort">
            <span className="muted">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="next">Next airing</option>
              <option value="name">A–Z</option>
              <option value="newest">Newest shows</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <section className="discover-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div className="show-card skeleton-card" key={i}>
              <div className="skeleton-poster" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </section>
      ) : message ? (
        <section className="panel empty-state">
          <h2>Discovery unavailable</h2>
          <p className="muted">{message}</p>
        </section>
      ) : filtered.length === 0 ? (
        <section className="panel empty-state">
          <h2>No shows found</h2>
          <p className="muted">Try another title or genre.</p>
        </section>
      ) : (
        <section>
          <div className="section-heading">
            <h2>{airing !== "All" ? airing : platform !== "All" ? platform : genre === "All" ? "Active shows" : genre}</h2>
            <span className="muted">{filtered.length} shows · {language === "English" ? "English" : language === "All" ? "All languages" : "Other languages"} · {region === "North America" ? "North America" : region === "All" ? "All regions" : region}</span>
          </div>

          <div className="discover-grid">
            {displayed.map((s) => (
              <article className="show-card panel" key={s.id}>
                <div className="poster-wrap">
                  <Link href={"/show/" + s.id} aria-label={"View " + s.name}>
                    {s.image?.medium ? (
                      <img src={s.image.medium} alt={s.name} loading="lazy" />
                    ) : (
                      <div className="poster-fallback">{s.name.slice(0, 1)}</div>
                    )}
                  </Link>

                  <span className="status-badge">
                    {s._discoverStatus || "Active"}
                  </span>
                </div>

                <div className="show-card-body">
                  <h3>{s.name}</h3>

                  <p className="muted show-meta">
                    {s.network?.name || s.webChannel?.name || "TV"}
                    {year(s) ? " · " + year(s) : ""}
                  </p>

                  {s._nextAirdate && (
                    <p className="show-next muted">
                      Next: {formatDate(s._nextAirdate)}
                      {s._nextAirtime ? " · " + s._nextAirtime : ""}
                    </p>
                  )}

                  {s.genres?.length ? (
                    <div className="show-genres">
                      {s.genres.slice(0, 2).map((g) => (
                        <span key={g}>{g}</span>
                      ))}
                    </div>
                  ) : null}

                  {s.summary && (
                    <p className="show-summary muted">
                      {clean(s.summary).slice(0, 105)}
                      {clean(s.summary).length > 105 ? "…" : ""}
                    </p>
                  )}

                  <div className="card-actions">
                    <TrackButton showId={s.id} title={s.name} compact />
                    <Link href={"/show/" + s.id} className="view-link">
                      View →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {visible < filtered.length && (
            <div className="load-more-wrap">
              <button
                onClick={() => setVisible((v) => v + 48)}
                className="nav-pill load-more-button"
              >
                Load more shows
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}