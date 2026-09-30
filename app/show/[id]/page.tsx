import Link from "next/link";
import TrackButton from "@/components/track-button";

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
    .filter((e: any) => !upcoming.some((u: any) => u.id === e.id))
    .slice(-5)
    .reverse();

  const cast = (s._embedded?.cast || []).slice(0, 6);
  const network = s.network?.name || s.webChannel?.name || "TV";
  const status = getStatus(s.status, upcoming, today);

  return (
    <main className="shell">
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

            {s.rating?.average && (
              <div className="muted">TVMaze rating: {s.rating.average}/10</div>
            )}

            <TrackButton showId={s.id} title={s.name} />
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