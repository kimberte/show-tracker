"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import { getSupabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [shows, setShows] = useState(0);
  const [episodes, setEpisodes] = useState(0);
  const [behind, setBehind] = useState(0);
  const [airedEpisodes, setAiredEpisodes] = useState(0);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setSignedIn(true);

      const [{ count: showCount }, { count: episodeCount }, { data: trackedRows }, { data: watchRows }] = await Promise.all([
        supabase
          .from("tracked_shows")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("episode_watches")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("tracked_shows")
          .select("show_id,show:shows(tvmaze_id)")
          .eq("user_id", user.id),
        supabase
          .from("episode_watches")
          .select("show_id,tvmaze_episode_id")
          .eq("user_id", user.id),
      ]);

      setShows(showCount || 0);
      setEpisodes(episodeCount || 0);

      const watchedByShow = new Map<number, Set<number>>();
      for (const row of watchRows || []) {
        const showId = Number(row.show_id);
        const ids = watchedByShow.get(showId) || new Set<number>();
        ids.add(Number(row.tvmaze_episode_id));
        watchedByShow.set(showId, ids);
      }

      const today = new Date().toLocaleDateString("en-CA");
      const progressRows = await Promise.all(
        (trackedRows || []).map(async (row: any) => {
          const show = Array.isArray(row.show) ? row.show[0] : row.show;
          if (!show?.tvmaze_id) return { aired: 0, watched: 0 };
          try {
            const response = await fetch("https://api.tvmaze.com/shows/" + show.tvmaze_id + "?embed[]=episodes");
            if (!response.ok) return { aired: 0, watched: 0 };
            const data = await response.json();
            const aired = (data._embedded?.episodes || []).filter((episode: any) => episode.airdate && episode.airdate < today);
            const watchedIds = watchedByShow.get(Number(row.show_id)) || new Set<number>();
            return {
              aired: aired.length,
              watched: aired.filter((episode: any) => watchedIds.has(Number(episode.id))).length,
            };
          } catch {
            return { aired: 0, watched: 0 };
          }
        })
      );

      const totalAired = progressRows.reduce((total, row) => total + row.aired, 0);
      const totalWatchedAired = progressRows.reduce((total, row) => total + row.watched, 0);
      setAiredEpisodes(totalAired);
      setBehind(Math.max(0, totalAired - totalWatchedAired));
      setLoading(false);
    }

    load();
  }, []);

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function deleteAccount() {
    if (accountBusy) return;
    const confirmed = window.confirm(
      "Delete your My TV Tracker account permanently? This removes your tracked shows, watched episodes, notification settings, and account data. This cannot be undone."
    );
    if (!confirmed) return;

    setAccountBusy(true);
    setAccountMessage("");
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete your account.");
      window.location.href = "/";
    } catch (error: any) {
      setAccountMessage(error?.message || "Could not delete your account. Please try again.");
      setAccountBusy(false);
    }
  }

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <div className="accent eyebrow">YOUR TV STATS</div>
          <h1 className="page-title">Profile</h1>
          <p className="muted page-subtitle">A little scoreboard for your TV obsession.</p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading your stats…</p>
      ) : !signedIn ? (
        <section className="panel empty-state">
          <h2>Sign in to see your stats</h2>
          <p className="muted">Track shows and mark episodes watched to build your personal TV history.</p>
          <Link href="/login" className="primary-button">Sign in</Link>
        </section>
      ) : (
        <>
          <section className="profile-stats-grid">
            <article className="panel profile-stat-card">
              <div className="accent eyebrow">SHOWS TRACKED</div>
              <strong>{shows}</strong>
              <span className="muted">in your current tracker</span>
            </article>
            <article className="panel profile-stat-card">
              <div className="accent eyebrow">EPISODES WATCHED</div>
              <strong>{episodes}</strong>
              <span className="muted">checked off by you</span>
            </article>
            <article className="panel profile-stat-card">
              <div className="accent eyebrow">EPISODES TO CATCH UP</div>
              <strong>{behind}</strong>
              <span className="muted">aired episodes not checked off</span>
            </article>
          </section>

          <section className="panel profile-next">
            <div>
              <div className="accent eyebrow">YOUR WATCH PROGRESS</div>
              <h2>{airedEpisodes === 0 ? "Your watch history starts here" : Math.round(((airedEpisodes - behind) / airedEpisodes) * 100) + "% of aired episodes watched"}</h2>
              <p className="muted">{airedEpisodes === 0 ? "As you track shows and check off aired episodes, your progress will appear here." : (airedEpisodes - behind) + " of " + airedEpisodes + " aired episodes across your tracked shows are marked watched."}</p>
            </div>
            <Link href="/my-shows" className="accent">Review My Shows →</Link>
          </section>

          <section className="panel account-panel">
            <div>
              <div className="accent eyebrow">ACCOUNT</div>
              <h2>Account settings</h2>
              <p className="muted">Sign out on this device or permanently delete your My TV Tracker account and its personal data.</p>
            </div>
            <div className="account-actions">
              <button type="button" onClick={signOut} className="account-button">Log out</button>
              <button type="button" onClick={deleteAccount} disabled={accountBusy} className="account-button account-delete">
                {accountBusy ? "Deleting…" : "Delete account"}
              </button>
            </div>
            {accountMessage && <p className="muted account-message">{accountMessage}</p>}
          </section>
        </>
      )}
    </main>
  );
}
