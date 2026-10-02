"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import { getSupabase } from "@/lib/supabase";

type Show = {
  tvmaze_id: number;
  title: string;
  poster_url?: string | null;
  network?: string | null;
};

type Tracked = { id: number; show: Show | null };

type Episode = {
  id: number;
  season: number;
  number: number;
  name: string;
  airdate?: string | null;
  airtime?: string | null;
  runtime?: number | null;
  summary?: string | null;
};

type Item = { trackedId: number; show: Show; episode: Episode };

function clean(t: string) {
  return t.replace(/<[^>]*>/g, "").trim();
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Today() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
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
        .select("id,show:shows(tvmaze_id,title,poster_url,network)")
        .eq("user_id", user.id);

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const list = (data || []) as unknown as Tracked[];
      const today = new Date().toLocaleDateString("en-CA");
      const found: Item[] = [];

      await Promise.all(
        list.map(async (item) => {
          if (!item.show) return;

          try {
            const r = await fetch(
              "https://api.tvmaze.com/shows/" +
                item.show.tvmaze_id +
                "?embed[]=episodes"
            );

            if (!r.ok) return;

            const s = await r.json();

            for (const e of (s._embedded?.episodes || []) as Episode[]) {
              if (e.airdate === today) {
                found.push({
                  trackedId: item.id,
                  show: item.show,
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

      setItems(found);
      setLoading(false);
    }

    load();
  }, []);

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <Link href="/" className="muted">← My TV Tracker</Link>
          <div className="accent eyebrow">YOUR TV SCHEDULE</div>
          <h1 className="page-title">Today</h1>
          <p className="muted page-subtitle">
            Episodes airing today from shows you’re tracking.
          </p>
          <p className="muted schedule-date">{formatDate(new Date().toLocaleDateString("en-CA"))}</p>
        </div>

        <nav className="top-nav">
          <Link className="nav-pill" href="/my-shows">My Shows</Link>
          <Link className="nav-pill" href="/upcoming">Upcoming</Link>
          <Link className="nav-pill" href="/discover">Discover</Link>
        </nav>
      </header>

      {loading ? (
        <p className="muted">Checking your shows…</p>
      ) : items.length === 0 ? (
        <section className="panel empty-state">
          <h2>Nothing airing today</h2>
          <p className="muted">You don't have a tracked episode airing today.</p>
          <Link href="/my-shows" className="accent">View My Shows →</Link>
        </section>
      ) : (
        <section className="episode-list">
          {items.map((item) => (
            <article
              key={item.trackedId + "-" + item.episode.id}
              className="panel episode-card"
            >
              {item.show.poster_url && (
                <img src={item.show.poster_url} width="78" height="108" alt="" />
              )}

              <div className="episode-card-info">
                <div className="accent episode-time">
                  {item.episode.airtime || "TIME TBA"}
                </div>
                <h2>{item.episode.name}</h2>
                <div className="muted">
                  {item.show.title} · S{item.episode.season} E{item.episode.number}
                  {item.episode.runtime ? " · " + item.episode.runtime + " min" : ""}
                </div>

                {item.episode.summary && (
                  <p className="muted episode-summary">
                    {clean(item.episode.summary)}
                  </p>
                )}

                <Link href={"/show/" + item.show.tvmaze_id} className="accent">
                  View show →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}