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
};
type Item = { show: Show; episode: Episode };

function dateKey(e: Episode) {
  return e.airdate || "9999-99-99";
}
function formatDate(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function groupLabel(date: string, today: string, tomorrow: string) {
  if (date === today) return "Today";
  if (date === tomorrow) return "Tomorrow";
  return formatDate(date);
}

export default function Upcoming() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }

      setSignedIn(true);

      const { data, error } = await supabase
        .from("tracked_shows")
        .select("id,show:shows(tvmaze_id,title,poster_url,network)")
        .eq("user_id", user.id);

      if (error) {
        setLoading(false);
        return;
      }

      const list = (data || []) as unknown as Tracked[];

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

      const today = new Date();
      const todayKey = today.toLocaleDateString("en-CA");
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() + 30);
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
              if (
                e.airdate &&
                e.airdate >= todayKey &&
                new Date(e.airdate + "T12:00:00") <= cutoff
              ) {
                found.push({ show: item.show, episode: e });
              }
            }
          } catch {}
        })
      );

      found.sort((a, b) =>
        (dateKey(a.episode) + (a.episode.airtime || "")).localeCompare(
          dateKey(b.episode) + (b.episode.airtime || "")
        )
      );

      setItems(found);
      setLoading(false);
    }

    load();
  }, []);

  const groups = items.reduce<Record<string, Item[]>>((acc, item) => {
    const key = item.episode.airdate || "unknown";
    (acc[key] ||= []).push(item);
    return acc;
  }, {});

  const todayKey = new Date().toLocaleDateString("en-CA");
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowKey = tomorrowDate.toLocaleDateString("en-CA");

  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <Link href="/" className="muted">← My TV Tracker</Link>
          <div className="accent eyebrow">YOUR TV SCHEDULE</div>
          <h1 className="page-title">Upcoming</h1>
          <p className="muted page-subtitle">
            The next 30 days across shows you’re tracking.
          </p>
          <p className="muted schedule-note">
            Only shows in your personal tracker are included here.
          </p>
        </div>
      </header>

      {loading ? (
        <p className="muted">Loading your upcoming schedule…</p>
       ) : !signedIn ? (
        <section className="panel empty-state">
          <h2>Sign in to see what’s coming up</h2>
          <p className="muted">Your Upcoming schedule is built from the shows you track.</p>
          <Link href="/login" className="primary-button">Sign in</Link>
        </section>
      ) : items.length === 0 ? (
        <section className="panel" style={{ padding: 24 }}>
          <h2>No upcoming episodes</h2>
          <p className="muted">
            There are no announced episodes in the next 30 days for your tracked shows.
          </p>
          <Link href="/my-shows" className="accent">View My Shows →</Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 28 }}>
          {Object.entries(groups).map(([date, list]) => (
            <section key={date}>
              <h2 style={{ marginBottom: 12 }}>
                {groupLabel(date, todayKey, tomorrowKey)}
              </h2>
              <div style={{ display: "grid", gap: 10 }}>
                {list.map((item) => (
                  <Link
                    href={"/show/" + item.show.tvmaze_id}
                    key={item.show.tvmaze_id + "-" + item.episode.id}
                    className="panel upcoming-episode-link"
                    style={{
                      padding: 15,
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    {item.show.poster_url && (
                      <span aria-hidden="true">
                        <img
                          src={item.show.poster_url}
                          width="60"
                          height="84"
                          style={{
                            objectFit: "cover",
                            borderRadius: 9,
                            flexShrink: 0,
                          }}
                          alt=""
                        />
                    </span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="muted" style={{ fontSize: 13, fontWeight: 700 }}>
                        {item.episode.airtime || "Time TBA"}
                      </div>
                      <h3 className="upcoming-show-title">{item.show.title}</h3>
                      <div className="muted">
                        {item.episode.name} · S{item.episode.season} E{item.episode.number}
                        {item.episode.runtime ? " · " + item.episode.runtime + " min" : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
