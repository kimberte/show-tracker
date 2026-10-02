import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";
import EpisodeWatchList from "@/components/episode-watch-list";
import type { Metadata } from "next";

async function getShow(id: string) {
  const r = await fetch(
    "https://api.tvmaze.com/shows/" +
      id +
      "?embed[]=episodes&embed[]=cast",
    { next: { revalidate: 3600 } }
  );

  if (!r.ok) return null;
  return r.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getShow(id);
  if (!s) return { title: "Show not found | My TV Tracker" };
  const description = s.summary
    ? clean(s.summary).slice(0, 155)
    : `Track ${s.name}, see upcoming episodes, and never miss what's next.`;
  return {
    title: `${s.name} — Episodes, Schedule & Tracking | My TV Tracker`,
    description,
    alternates: { canonical: `/show/${s.id}` },
    openGraph: { title: `${s.name} | My TV Tracker`, description, type: "website" },
  };
}

function clean(text: string) {
  return text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatus(showStatus: string | undefined, upcoming: any[], today: string) {
  if (upcoming.some((e) => e.airdate === today)) return "Airing today";
  if (upcoming.length > 0) return "Airing soon";
  if (showStatus === "Running") return "On hiatus";
  if (showStatus === "Ended") return "Ended";
  return "No upcoming episode";
}

export default async function ShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getShow(id);

  if (!s) {
    return (
      <main className="shell">
        <Link href="/" className="muted">← Show Tracker</Link>
        <h1>Show not found</h1>
      </main>
    );
  }

  const episodes = s._embedded?.episodes || [];
  const today = new Date().toLocaleDateString("en-CA");

  const upcoming = episodes
    .filter(
      (e: any) =>
        e.airdate && new Date(e.airdate + "T23:59:59") >= new Date()
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.airdate).getTime() - new Date(b.airdate).getTime()
    )
    .slice(0, 8);

  const recent = episodes
    .filter((e: any) => e.airdate && e.airdate < today)
    .sort(
      (a: any, b: any) =>
        new Date(b.airdate).getTime() - new Date(a.airdate).getTime()
    )
    .slice(0, 5);

  const cast = (s._embedded?.cast || []).slice(0, 6);
  const network = s.network?.name || s.webChannel?.name || "TV";
  const status = getStatus(s.status, upcoming, today);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: s.name,
    description: s.summary ? clean(s.summary).slice(0, 300) : undefined,
    image: s.image?.original || s.image?.medium || undefined,
    genre: s.genres?.length ? s.genres : undefined,
    dateCreated: s.premiered || undefined,
    url: `https://mytvtracker.app/show/${s.id}`,
    sameAs: s.officialSite ? [s.officialSite] : undefined,
    actor: cast.map((c: any) => ({
      "@type": "Person",
      name: c.person?.name,
    })),
  };

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "My TV Tracker", item: "https://mytvtracker.app/" },
      { "@type": "ListItem", position: 2, name: s.name, item: `https://mytvtracker.app/show/${s.id}` },
    ],
  };

  return (
    <main className="shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <SiteNav />
      <div className="show-detail-nav">
        <Link href="/my-shows" className="muted">← My Shows</Link>
        <Link href="/" className="muted">Search</Link>
      </div>

      <section className="panel show-detail-hero">
        <div className="show-hero">
          {s.image?.original ? (
            <img
              className="show-poster"
              src={s.image.original}
              width="260"
              height="370"
              alt={s.name}
            />
          ) : (
            <div className="show-poster-fallback panel" />
          )}

          <div>
            <div className="accent show-network">{network}</div>
            <div className="show-status-pill">{status}</div>
            <h1 className="hero-title show-detail-title">{s.name}</h1>

            <div className="muted show-meta-line">
              {s.type && <span>{s.type}</span>}
              {s.premiered && <span>• Premiered {formatDate(s.premiered)}</span>}
              {s.runtime && <span>• {s.runtime} min</span>}
            </div>

            {s.genres?.length > 0 && (
              <div className="show-genre-list">
                {s.genres.map((g: string) => (
                  <span key={g} className="panel">{g}</span>
                ))}
              </div>
            )}

            <div className="show-description">
              {s.summary ? (
                <p>{clean(s.summary)}</p>
              ) : (
                <p className="muted">No description available.</p>
              )}
            </div>

            {(s.network?.name || s.webChannel?.name) && (
              <div className="show-watch-note muted">
                Watch on {s.network?.name || s.webChannel?.name}
              </div>
            )}

            {s.rating?.average && (
              <div className="muted">TVMaze rating: {s.rating.average}/10</div>
            )}

            <div className="show-action-row">
              <TrackButton showId={s.id} title={s.name} />
              <a
                className="nav-pill show-action-link"
                href={"https://www.youtube.com/results?search_query=" + encodeURIComponent(s.name + " official trailer")}
                target="_blank"
                rel="noreferrer"
              >
                ▶ Find Trailer
              </a>
              <a
                className="nav-pill show-action-link"
                href={"https://www.google.com/search?q=" + encodeURIComponent(s.name + " where to watch")}
                target="_blank"
                rel="noreferrer"
              >
                Where to Watch
              </a>
            </div>
          </div>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="show-section">
          <div className="section-heading">
            <h2>Upcoming episodes</h2>
            <span className="muted">{upcoming.length} shown</span>
          </div>

          <div className="episode-list">
            {upcoming.map((e: any) => (
              <article className="panel episode-card episode-card-simple" key={e.id}>
                <div className="episode-card-info">
                  <div className="episode-row">
                    <strong>S{e.season} E{e.number} — {e.name}</strong>
                    <span className="accent">{formatDate(e.airdate)}</span>
                  </div>
                  <div className="muted">
                    {e.airtime || "Time TBA"}
                    {e.runtime ? " • " + e.runtime + " min" : ""}
                  </div>
                  {e.summary && (
                    <p className="muted episode-summary">{clean(e.summary)}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {cast.length > 0 && (
        <section className="show-section">
          <h2>Cast</h2>
          <div className="cast-grid">
            {cast.map((c: any) => (
              <div className="panel cast-card" key={c.person.id}>
                {c.person.image?.medium && (
                  <img src={c.person.image.medium} width="55" height="70" alt="" />
                )}
                <div>
                  <strong>{c.person.name}</strong>
                  <div className="muted">{c.character?.name}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <EpisodeWatchList tvmazeShowId={s.id} title={s.name} episodes={episodes} />

      {recent.length > 0 && (
        <section className="show-section">
          <h2>Recent episodes</h2>
          <div className="episode-list">
            {recent.map((e: any) => (
              <div className="panel recent-episode" key={e.id}>
                <strong>S{e.season} E{e.number} — {e.name}</strong>
                <div className="muted">
                  {e.airdate ? formatDate(e.airdate) : "Date TBA"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}