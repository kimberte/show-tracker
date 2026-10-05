import type { Metadata } from "next";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function clean(text: string) {
  return text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDate(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

async function getShow(slug: string) {
  const query = slug.replace(/-/g, " ");
  const r = await fetch("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(query), { next: { revalidate: 86400 } });
  if (!r.ok) return null;
  const matches = await r.json();
  const exact = matches.find((item: any) => slugify(item.show?.name || "") === slug);
  return exact?.show?.id ? getShowById(exact.show.id) : null;
}

async function getShowById(id: number) {
  const r = await fetch("https://api.tvmaze.com/shows/" + id + "?embed[]=episodes&embed[]=cast", { next: { revalidate: 3600 } });
  return r.ok ? r.json() : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) return { title: "TV Show Not Found | My TV Tracker", robots: { index: false, follow: true } };
  const description = show.summary
    ? clean(show.summary).slice(0, 155)
    : "Track " + show.name + ", see its schedule and upcoming episodes.";
  const canonical = "/shows/" + slug;
  return {
    title: show.name + " — Episodes, Schedule & Where to Watch | My TV Tracker",
    description,
    alternates: { canonical },
    openGraph: {
      title: show.name + " | My TV Tracker",
      description,
      type: "website",
      url: canonical,
      images: show.image?.original ? [{ url: show.image.original, alt: show.name }] : undefined,
    },
  };
}

export default async function ShowSeoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) {
    return <main className="shell"><SiteNav /><h1>TV show not found</h1><p><Link href="/" className="accent">Search My TV Tracker →</Link></p></main>;
  }

  const episodes = show._embedded?.episodes || [];
  const today = new Date().toLocaleDateString("en-CA");
  const upcoming = episodes.filter((e: any) => e.airdate && e.airdate >= today).sort((a: any,b: any) => (a.airdate+a.airtime).localeCompare(b.airdate+b.airtime)).slice(0, 10);
  const recent = episodes.filter((e: any) => e.airdate && e.airdate < today).sort((a: any,b: any) => b.airdate.localeCompare(a.airdate)).slice(0, 5);
  const showSlug = slugify(show.name);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    description: show.summary ? clean(show.summary).slice(0, 300) : undefined,
    image: show.image?.original || show.image?.medium,
    genre: show.genres,
    dateCreated: show.premiered,
    url: "https://www.mytvtracker.app/shows/" + showSlug,
    sameAs: show.officialSite ? [show.officialSite] : undefined,
  };

  return <main className="shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
    <SiteNav />
    <div className="show-detail-nav"><Link href="/" className="muted">← Search</Link><Link href="/tv-tonight" className="muted">TV Tonight</Link></div>
    <section className="panel show-detail-hero">
      <div className="show-hero">
        {show.image?.original ? <img className="show-poster" src={show.image.original} width="260" height="370" alt={show.name} /> : <div className="show-poster-fallback panel" />}
        <div>
          <div className="accent show-network">{show.network?.name || show.webChannel?.name || "TV"}</div>
          <div className="show-status-pill">{show.status}</div>
          <h1 className="hero-title show-detail-title">{show.name}</h1>
          <div className="muted show-meta-line">{show.type}{show.premiered ? " • Premiered " + formatDate(show.premiered) : ""}{show.runtime ? " • " + show.runtime + " min" : ""}</div>
          {show.genres?.length > 0 && <div className="show-genre-list">{show.genres.map((genre: string) => <Link key={genre} href={"/genres/" + slugify(genre)} className="panel">{genre}</Link>)}</div>}
          <div className="show-description">{show.summary ? <p>{clean(show.summary)}</p> : <p className="muted">No description available.</p>}</div>
          <div className="show-action-row"><TrackButton showId={show.id} title={show.name} /><Link className="nav-pill show-action-link" href={"/show/" + show.id}>Full tracker view</Link></div>
        </div>
      </div>
    </section>

    {upcoming.length > 0 && <section className="show-section"><div className="section-heading"><h2>Upcoming episodes</h2><span className="muted">{upcoming.length} shown</span></div><div className="episode-list">{upcoming.map((e:any) => <article className="panel episode-card episode-card-simple" key={e.id}><div className="episode-card-info"><div className="episode-row"><strong>S{e.season} E{e.number} — {e.name}</strong><span className="accent">{formatDate(e.airdate)}</span></div><div className="muted">{e.airtime || "Time TBA"}{e.runtime ? " • " + e.runtime + " min" : ""}</div></div></article>)}</div></section>}

    {recent.length > 0 && <section className="show-section"><h2>Recent episodes</h2><div className="episode-list">{recent.map((e:any) => <article className="panel recent-episode" key={e.id}><strong>S{e.season} E{e.number} — {e.name}</strong><div className="muted">{formatDate(e.airdate)}</div></article>)}</div></section>}

    <section className="seo-cta panel"><h2>Never miss an episode</h2><p className="muted">Track {show.name} and get your personal TV schedule and daily alerts from My TV Tracker.</p><TrackButton showId={show.id} title={show.name} /></section>
  </main>;
}
