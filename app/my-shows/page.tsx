"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import { getSupabase } from "@/lib/supabase";

type Show = {
  id: number;
  tvmaze_id: number;
  title: string;
  poster_url?: string | null;
  network?: string | null;
  country?: string | null;
  description?: string | null;
};

type Tracked = { id: number; show: Show | null };

type Episode = {
  id: number;
  season: number;
  number: number;
  name: string;
  airdate?: string | null;
  airtime?: string | null;
};

function episodeLabel(e: Episode) {
  return "S" + e.season + " E" + e.number + " · " + e.name;
}

function episodeDate(e: Episode) {
  if (!e.airdate) return "";
  return (
    new Date(e.airdate + "T12:00:00").toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + (e.airtime ? " · " + e.airtime : "")
  );
}

function showStatus(showStatus: string | undefined, next: Episode | null, today: string) {
  if (next?.airdate === today) return "Airing today";
  if (next) return "Airing soon";
  if (showStatus === "Running") return "On hiatus";
  if (showStatus === "Ended") return "Ended";
  return "No upcoming episode";
}

export default function MyShows() {
  const [shows, setShows] = useState<Tracked[]>([]);
  const [episodes, setEpisodes] = useState<
    Record<number, { next: Episode | null; last: Episode | null; status?: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setMessage("");

    const supabase = getSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tracked_shows")
      .select("id,show:shows(id,tvmaze_id,title,poster_url,network,country,description)")
      .eq("user_id", user.id);

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as unknown as Tracked[];
    list.sort((a, b) => (a.show?.title || "").localeCompare(b.show?.title || ""));
    setShows(list);

    const today = new Date().toLocaleDateString("en-CA");

    const details = await Promise.all(
      list.map(async (item) => {
        if (!item.show) {
          return [item.id, { next: null, last: null }] as const;
        }

        try {
          const r = await fetch(
            "https://api.tvmaze.com/shows/" +
              item.show.tvmaze_id +
              "?embed[]=episodes"
          );

          if (!r.ok) {
            return [item.id, { next: null, last: null }] as const;
          }

          const s = await r.json();
          const eps = (s._embedded?.episodes || []) as Episode[];

          const next =
            eps
              .filter((e) => e.airdate && e.airdate >= today)
              .sort((a, b) => (a.airdate || "").localeCompare(b.airdate || ""))[0] ||
            null;

          const last =
            eps
              .filter((e) => e.airdate && e.airdate < today)
              .sort((a, b) => (b.airdate || "").localeCompare(a.airdate || ""))[0] ||
            null;

          return [item.id, { next, last, status: s.status }] as const;
        } catch {
          return [item.id, { next: null, last: null }] as const;
        }
      })
    );

    setEpisodes(Object.fromEntries(details));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(trackedId: number) {
    setBusyId(trackedId);
    setMessage("");

    const supabase = getSupabase();
    const { error } = await supabase
      .from("tracked_shows")
      .delete()
      .eq("id", trackedId);

    if (error) setMessage(error.message);
    else setShows((current) => current.filter((item) => item.id !== trackedId));

    setBusyId(null);
  }

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <Link href="/" className="muted">← Show Tracker</Link>
          <div className="accent eyebrow">YOUR LIBRARY</div>
          <h1 className="page-title">My Shows</h1>
          <p className="muted page-subtitle">Your personal watch list and what’s coming next.</p>
        </div>

      </header>

      {loading ? (
        <p className="muted">Loading your shows…</p>
      ) : shows.length === 0 ? (
        <section className="panel empty-state">
          <h2>Nothing tracked yet</h2>
          <p className="muted">Search for a show and add it to your list.</p>
          <Link href="/" className="primary-button">Find shows</Link>
        </section>
      ) : (
        <section className="my-shows-grid">
          {shows.map((item) => {
            const s = item.show;
            if (!s) return null;

            const e = episodes[item.id] || { next: null, last: null };
            const status = showStatus(
              e.status,
              e.next,
              new Date().toLocaleDateString("en-CA")
            );

            return (
              <article key={item.id} className="panel my-show-card">
                {s.poster_url && (
                  <img src={s.poster_url} width="92" height="128" alt="" />
                )}

                <div className="my-show-info">
                  <div className="my-show-topline">
                    <span className="status-badge-inline">{status}</span>
                    <span className="muted">{s.network || s.country || "TV show"}</span>
                  </div>

                  <h2>{s.title}</h2>

                  {e.next ? (
                    <div className="episode-highlight">
                      <span className="accent">Next episode</span>
                      <strong>{episodeLabel(e.next)}</strong>
                      <span className="muted">{episodeDate(e.next)}</span>
                    </div>
                  ) : (
                    <div className="episode-highlight">
                      <span className="muted">No upcoming episode announced.</span>
                    </div>
                  )}

                  {e.last && (
                    <div className="muted my-show-last">
                      Last: {episodeLabel(e.last)} · {episodeDate(e.last)}
                    </div>
                  )}

                  <div className="my-show-actions">
                    <Link href={"/show/" + s.tvmaze_id} className="accent">
                      View show →
                    </Link>
                    <button
                      onClick={() => remove(item.id)}
                      disabled={busyId === item.id}
                      className="remove-button"
                    >
                      {busyId === item.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {message && <p className="muted">{message}</p>}
    </main>
  );
}