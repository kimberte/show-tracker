"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Episode = {
  id: number;
  season: number;
  number: number;
  name: string;
  airdate?: string | null;
};

export default function EpisodeWatchList({
  tvmazeShowId,
  title,
  episodes,
}: {
  tvmazeShowId: number;
  title: string;
  episodes: Episode[];
}) {
  const [showDbId, setShowDbId] = useState<number | null>(null);
  const [watched, setWatched] = useState<Set<number>>(new Set());
  const [userReady, setUserReady] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [busy, setBusy] = useState<number | string | null>(null);
  const [message, setMessage] = useState("");

  const aired = useMemo(
    () =>
      episodes
        .filter((e) => e.airdate && e.airdate < new Date().toLocaleDateString("en-CA"))
        .sort((a, b) => {
          if (a.season !== b.season) return a.season - b.season;
          return a.number - b.number;
        }),
    [episodes]
  );

  const seasons = useMemo(() => {
    const map = new Map<number, Episode[]>();
    aired.forEach((episode) => {
      const list = map.get(episode.season) || [];
      list.push(episode);
      map.set(episode.season, list);
    });
    return Array.from(map.entries()).reverse();
  }, [aired]);

  useEffect(() => {
    let active = true;

    async function load() {
      setUserReady(false);
      setTracked(false);
      setShowDbId(null);
      setWatched(new Set());

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (active) setUserReady(true);
        return;
      }

      const { data: show } = await supabase
        .from("shows")
        .select("id")
        .eq("tvmaze_id", tvmazeShowId)
        .maybeSingle();

      if (!show) {
        if (active) setUserReady(true);
        return;
      }

      const { data: trackedRow } = await supabase
        .from("tracked_shows")
        .select("id")
        .eq("user_id", user.id)
        .eq("show_id", show.id)
        .maybeSingle();

      if (!trackedRow) {
        if (active) setUserReady(true);
        return;
      }

      const { data: rows, error } = await supabase
        .from("episode_watches")
        .select("tvmaze_episode_id")
        .eq("user_id", user.id)
        .eq("show_id", show.id);

      if (active) {
        setShowDbId(show.id);
        setTracked(true);
        setWatched(new Set((rows || []).map((row: any) => Number(row.tvmaze_episode_id))));
        if (error) setMessage(error.message);
        setUserReady(true);
      }
    }

    const onTrackedShowChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ showId?: number }>).detail;
      if (detail?.showId === tvmazeShowId) void load();
    };

    window.addEventListener("mytvtracker:tracked-show-changed", onTrackedShowChanged);
    void load();

    return () => {
      active = false;
      window.removeEventListener("mytvtracker:tracked-show-changed", onTrackedShowChanged);
    };
  }, [tvmazeShowId]);

  async function toggleEpisode(episode: Episode) {
    if (!showDbId) return;

    setBusy(episode.id);
    setMessage("");

    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in to track watched episodes.");
      setBusy(null);
      return;
    }

    if (watched.has(episode.id)) {
      const { error } = await supabase
        .from("episode_watches")
        .delete()
        .eq("user_id", user.id)
        .eq("show_id", showDbId)
        .eq("tvmaze_episode_id", episode.id);

      if (error) setMessage(error.message);
      else setWatched((current) => {
        const next = new Set(current);
        next.delete(episode.id);
        return next;
      });
    } else {
      const { error } = await supabase.from("episode_watches").upsert(
        {
          user_id: user.id,
          show_id: showDbId,
          tvmaze_episode_id: episode.id,
          season_number: episode.season,
          episode_number: episode.number,
        },
        { onConflict: "user_id,tvmaze_episode_id" }
      );

      if (error) setMessage(error.message);
      else setWatched((current) => new Set(current).add(episode.id));
    }

    setBusy(null);
  }

  async function toggleSeason(season: number, seasonEpisodes: Episode[]) {
    if (!showDbId) return;

    setBusy("season-" + season);
    setMessage("");

    const allWatched = seasonEpisodes.every((episode) => watched.has(episode.id));
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Sign in to track watched episodes.");
      setBusy(null);
      return;
    }

    if (allWatched) {
      const { error } = await supabase
        .from("episode_watches")
        .delete()
        .eq("user_id", user.id)
        .eq("show_id", showDbId)
        .in("tvmaze_episode_id", seasonEpisodes.map((episode) => episode.id));

      if (error) {
        setMessage(error.message);
      } else {
        setWatched((current) => {
          const next = new Set(current);
          seasonEpisodes.forEach((episode) => next.delete(episode.id));
          return next;
        });
      }
    } else {
      const rows = seasonEpisodes
        .filter((episode) => !watched.has(episode.id))
        .map((episode) => ({
          user_id: user.id,
          show_id: showDbId,
          tvmaze_episode_id: episode.id,
          season_number: episode.season,
          episode_number: episode.number,
        }));

      if (rows.length) {
        const { error } = await supabase
          .from("episode_watches")
          .upsert(rows, { onConflict: "user_id,tvmaze_episode_id" });

        if (error) {
          setMessage(error.message);
        } else {
          setWatched((current) => {
            const next = new Set(current);
            seasonEpisodes.forEach((episode) => next.add(episode.id));
            return next;
          });
        }
      }
    }

    setBusy(null);
  }

  if (!userReady || !tracked || aired.length === 0) return null;

  return (
    <section className="show-section">
      <div className="section-heading">
        <div>
          <div className="accent eyebrow">YOUR WATCH HISTORY</div>
          <h2>Episodes watched</h2>
          <p className="muted">Check off episodes you’ve watched. Mark a whole season at once.</p>
        </div>
        <span className="muted">{watched.size} watched</span>
      </div>

      <div className="watch-season-list">
        {seasons.map(([season, seasonEpisodes]) => {
          const count = seasonEpisodes.filter((episode) => watched.has(episode.id)).length;
          const complete = count === seasonEpisodes.length;

          return (
            <details className="panel watch-season" key={season} open={season === seasons[0][0]}>
              <summary>
                <span>
                  <strong>Season {season}</strong>
                  <span className="muted"> · {count}/{seasonEpisodes.length} watched</span>
                </span>
                <button
                  type="button"
                  className={complete ? "watch-season-button complete" : "watch-season-button"}
                  onClick={(event) => {
                    event.preventDefault();
                    toggleSeason(season, seasonEpisodes);
                  }}
                  disabled={busy === "season-" + season}
                >
                  {busy === "season-" + season ? "Saving…" : complete ? "✓ Season watched" : "Mark season watched"}
                </button>
              </summary>

              <div className="watch-episode-list">
                {seasonEpisodes.map((episode) => {
                  const isWatched = watched.has(episode.id);
                  return (
                    <button
                      type="button"
                      key={episode.id}
                      className={"watch-episode" + (isWatched ? " watched" : "")}
                      onClick={() => toggleEpisode(episode)}
                      disabled={busy === episode.id}
                      aria-pressed={isWatched}
                    >
                      <span className="watch-check">{isWatched ? "✓" : ""}</span>
                      <span>
                        <strong>E{episode.number} · {episode.name}</strong>
                        {episode.airdate && (
                          <span className="muted">
                            {new Date(episode.airdate + "T12:00:00").toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      {message && <p className="muted">{message}</p>}
      <p className="muted" style={{ marginTop: 10 }}>
        Watching <strong>{title}</strong> counts toward your TV stats.
      </p>
    </section>
  );
}
