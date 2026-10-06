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
  const [seasons, setSeasons] = useState(0);
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

      const [{ count: showCount }, { count: episodeCount }, { data: seasonRows }] = await Promise.all([
        supabase
          .from("tracked_shows")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("episode_watches")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("episode_watches")
          .select("show_id,season_number")
          .eq("user_id", user.id),
      ]);

      setShows(showCount || 0);
      setEpisodes(episodeCount || 0);

      const uniqueSeasons = new Set(
        (seasonRows || []).map((row: any) => String(row.show_id) + "-" + String(row.season_number))
      );
      setSeasons(uniqueSeasons.size);
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
              <div className="accent eyebrow">SEASONS TOUCHED</div>
              <strong>{seasons}</strong>
              <span className="muted">with watched episodes</span>
            </article>
          </section>

          <section className="panel profile-next">
            <div>
              <div className="accent eyebrow">KEEP IT GOING</div>
              <h2>Build your TV history</h2>
              <p className="muted">Open any tracked show to check off episodes or mark an entire season watched.</p>
            </div>
            <Link href="/my-shows" className="accent">My Shows →</Link>
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
