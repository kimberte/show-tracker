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

type SeasonProgress = {
  season: number;
  aired: number;
  watched: number;
  behind: Episode[];
};

type Progress = {
  aired: number;
  watched: number;
  behind: Episode[];
  seasons: SeasonProgress[];
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
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    const supabase = getSupabase();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    const user = currentUser || session?.user || null;

    if (!user) {
      setSignedIn(false);
      setLoading(false);
      return;
    }

    setSignedIn(true);

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
    const hydrated = await Promise.all(
      list.map(async (item) => {
        if (!item.show || item.show.poster_url) return item;
        try {
          const r = await fetch("https://api.tvmaze.com/shows/" + item.show.tvmaze_id);
          if (!r.ok) return item;
          const tv = await r.json();
          return {
            ...item,
            show: {
              ...item.show,
              poster_url: tv.image?.medium || tv.image?.original || null,
            },
          };
        } catch {
          return item;
        }
      })
    );

    setShows(hydrated);

    const today = new Date().toLocaleDateString("en-CA");

    const details = await Promise.all(
      list.map(async (item) => {
        if (!item.show) {
          return [item.id, { next: null, last: null }] as const;
        }

        try {
          const { data: watchedRows } = await supabase
            .from("episode_watches")
            .select("tvmaze_episode_id")
            .eq("user_id", user.id)
            .eq("show_id", item.show.id);

          const watchedIds = new Set(
            (watchedRows || []).map((row: { tvmaze_episode_id: number }) => Number(row.tvmaze_episode_id))
          );

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

          const aired = eps.filter((e) => e.airdate && e.airdate < today);
          const behind = aired.filter((e) => !watchedIds.has(Number(e.id)));
          const seasonMap = new Map<number, SeasonProgress>();
          for (const episode of aired) {
            const season = Number(episode.season) || 0;
            const current = seasonMap.get(season) || { season, aired: 0, watched: 0, behind: [] };
            current.aired += 1;
            if (watchedIds.has(Number(episode.id))) current.watched += 1;
            else current.behind.push(episode);
            seasonMap.set(season, current);
          }
          const seasons = Array.from(seasonMap.values()).sort((a, b) => b.season - a.season);

          return [
            item.id,
            { next, last, status: s.status },
            { aired: aired.length, watched: aired.length - behind.length, behind, seasons },
          ] as const;
        } catch {
          return [item.id, { next: null, last: null }] as const;
        }
      })
    );

    setEpisodes(Object.fromEntries(details.map(([id, value]) => [id, value])));
    setProgress(
      Object.fromEntries(
        details.map(([id, _value, p]) => [id, p || { aired: 0, watched: 0, behind: [], seasons: [] }])
      )
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function shareShows() {
    if (!shows.length) return;

    const titles = shows
      .map((item) => item.show?.title)
      .filter(Boolean) as string[];

    const text = [
      "What I'm watching on My TV Tracker:",
      "",
      ...titles.map((title) => "• " + title),
      "",
      "Track your own shows:",
      window.location.origin,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "What I'm watching",
          text,
          url: window.location.origin,
        });
        setShareMessage("Ready to share");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setShareMessage("Copied to clipboard");
      } else {
        setShareMessage("Sharing isn't available on this device");
      }
    } catch {
      setShareMessage("");
    }
  }

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
          <Link href="/" className="muted">← My TV Tracker</Link>
          <div className="accent eyebrow">YOUR TRACKED SHOWS</div>
          <h1 className="page-title">My Shows</h1>
          <p className="muted page-subtitle">Your personal TV library — the shows you’ve chosen to track.</p>
          {!loading && shows.length > 0 && (
            <div className="my-shows-header-meta">
              <span className="my-shows-count">{shows.length} {shows.length === 1 ? "show" : "shows"} tracked</span>
              <button onClick={shareShows} className="my-shows-share-button">
                Share what I’m watching
              </button>
              {shareMessage && <span className="muted my-shows-share-message">{shareMessage}</span>}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading your shows…</p>
       ) : !signedIn ? (
        <section className="panel empty-state">
          <h2>Your TV library starts here</h2>
          <p className="muted">Sign in to track shows, see upcoming episodes, and get reminders.</p>
          <Link href="/login" className="primary-button">Sign in</Link>
        </section>
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
                <Link
                  href={"/show/" + s.tvmaze_id}
                  className="my-show-poster"
                  aria-label={"View " + s.title}
                >
                  {s.poster_url ? (
                    <img src={s.poster_url} width="92" height="128" alt="" />
                  ) : (
                    <span>{s.title.slice(0, 1).toUpperCase()}</span>
                  )}
                </Link>

                <div className="my-show-info">
                  <div className="my-show-topline">
                    <span className="status-badge-inline">{status}</span>
                    <span className="muted">{s.network || s.country || "TV show"}</span>
                  </div>

                  <h2><Link href={"/show/" + s.tvmaze_id} className="accent">{s.title}</Link></h2>

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

                  {progress[item.id] && (
                    <div className="my-show-progress">
                      <span>
                        {progress[item.id].watched} of {progress[item.id].aired} aired episodes watched
                      </span>
                      {progress[item.id].behind.length > 0 && (
                        <span className="accent">
                          {progress[item.id].behind.length} {progress[item.id].behind.length === 1 ? "episode" : "episodes"} behind
                        </span>
                      )}
                    </div>
                  )}

                  <div className="my-show-actions">
                    <Link href={"/show/" + s.tvmaze_id} className="muted my-show-open-hint">Open show details</Link>
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
