"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";

type Show = {
  id: number;
  name: string;
  status?: string;
  premiered?: string | null;
  image?: { medium?: string; original?: string } | null;
  network?: { name: string } | null;
  webChannel?: { name: string } | null;
  summary?: string | null;
  _nextAirdate: string;
  _nextAirtime?: string | null;
  _nextEpisode?: { name?: string; season?: number; number?: number };
  _isNew?: boolean;
};

function clean(t: string) {
  return t.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function NewAndUpcoming() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/new-and-upcoming")
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load new and upcoming shows.");
        return r.json();
      })
      .then(setShows)
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, []);

  const newShows = shows.filter((s) => s._isNew);
  const returning = shows.filter((s) => !s._isNew);

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <Link href="/" className="muted">← My TV Tracker</Link>
          <div className="accent eyebrow">DISCOVER WHAT'S NEXT</div>
          <h1 className="page-title">New & Upcoming Shows</h1>
          <p className="muted page-subtitle">
            Find new series and returning shows coming up, then track the ones you want to follow.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading new and upcoming shows…</p>
      ) : message ? (
        <section className="panel empty-state"><h2>Discovery unavailable</h2><p className="muted">{message}</p></section>
      ) : shows.length === 0 ? (
        <section className="panel empty-state"><h2>No upcoming shows found</h2><p className="muted">Try again later as schedules are announced.</p></section>
      ) : (
        <>
          {newShows.length > 0 && (
            <section className="new-upcoming-section">
              <div className="section-heading"><h2>New series</h2><span className="muted">{newShows.length} shows</span></div>
              <div className="new-upcoming-grid">
                {newShows.map((s) => <ShowCard key={s.id} show={s} />)}
              </div>
            </section>
          )}

          <section className="new-upcoming-section">
            <div className="section-heading"><h2>Returning & upcoming</h2><span className="muted">{returning.length} shows</span></div>
            <div className="new-upcoming-grid">
              {returning.map((s) => <ShowCard key={s.id} show={s} />)}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function ShowCard({ show: s }: { show: Show }) {
  const network = s.network?.name || s.webChannel?.name || "TV";
  return (
    <article className="panel new-upcoming-card">
      {s.image?.medium ? (
        <img src={s.image.medium} width="120" height="170" alt={s.name} loading="lazy" />
      ) : (
        <div className="new-upcoming-fallback">{s.name.slice(0, 1)}</div>
      )}
      <div className="new-upcoming-info">
        <div className="accent eyebrow" style={{ marginTop: 0 }}>{s._isNew ? "NEW SERIES" : "RETURNING"}</div>
        <h3>{s.name}</h3>
        <div className="muted">{network}</div>
        <p className="new-upcoming-date">
          {formatDate(s._nextAirdate)}{s._nextAirtime ? " · " + s._nextAirtime : ""}
        </p>
        {s._nextEpisode?.name && (
          <p className="muted">{s._nextEpisode.name} · S{s._nextEpisode.season} E{s._nextEpisode.number}</p>
        )}
        {s.summary && <p className="muted new-upcoming-summary">{clean(s.summary).slice(0, 120)}…</p>}
        <div className="card-actions">
          <TrackButton showId={s.id} title={s.name} compact />
          <Link href={"/show/" + s.id} className="view-link">View →</Link>
        </div>
      </div>
    </article>
  );
}
