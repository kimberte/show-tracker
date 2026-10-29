import type { Metadata } from "next";
import Link from "next/link";
import Home from "@/components/home-original";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "TV Discovery Preview | My TV Tracker",
  description: "Review additional TV discovery content alongside the existing My TV Tracker homepage experience.",
  robots: { index: false, follow: false },
};

type Episode = {
  id: number;
  name?: string;
  airdate?: string;
  airtime?: string;
  season?: number;
  number?: number;
  show?: {
    id: number;
    name: string;
    status?: string;
    image?: { medium?: string; original?: string };
    network?: { name?: string };
    webChannel?: { name?: string };
  };
};

async function schedule(date: string): Promise<Episode[]> {
  try {
    const response = await fetch("https://api.tvmaze.com/schedule?country=US&date=" + date, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? ((await response.json()) as Episode[]) : [];
  } catch {
    return [];
  }
}

function time(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return "Time TBA";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}


export default async function TvPreview() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const tomorrow = new Date(date + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const nextDate = tomorrow.toISOString().slice(0, 10);
  const [tonight, next] = await Promise.all([schedule(date), schedule(nextDate)]);
  const active = (items: Episode[]) => items.filter(e => e.show && ["Running", "In Development"].includes(e.show.status || ""));
  const easternTime = new Intl.DateTimeFormat("en-GB", {timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());
  const currentHour = Number(easternTime.slice(0,2));
  const todayItems = active(tonight).filter(e=>e.airtime && /^\\d{2}:\\d{2}$/.test(e.airtime) && Number(e.airtime.slice(0,2)) >= currentHour).sort((a,b)=>(a.airtime||"").localeCompare(b.airtime||"")).slice(0, 6);
  const nextItems = active(next).slice(0, 4);

  const episodeCards = (items: Episode[]) => items.map(e => (
    <article key={e.id} className="panel" style={{padding: 18, display: "flex", gap: 14, alignItems: "flex-start"}}>
      {e.show?.image?.medium ? <img src={e.show.image.medium} alt="" width={72} height={104} style={{objectFit: "cover", borderRadius: 8}} /> : null}
      <div style={{minWidth: 0}}>
        <div className="accent eyebrow">{time(e.airtime)} · {e.show?.network?.name || e.show?.webChannel?.name || "Network TBA"}</div>
        <h3 style={{margin: "8px 0"}}><Link href={`/show/${e.show?.id}`}>{e.show?.name}</Link></h3>
        <p className="muted" style={{margin: "0 0 8px"}}>Season {e.season ?? "?"}, Episode {e.number ?? "?"}{e.name ? ` · ${e.name}` : ""}</p>
        <Link className="view-link" href={`/show/${e.show?.id}`}>Show details →</Link>
      </div>
    </article>
  ));

  return <><Home /><main className="shell">
    <section style={{marginTop: 32}}> 
      <div className="accent eyebrow">LIVE TV GUIDE · US EASTERN SCHEDULE</div>
      <h2>What's on tonight</h2>
      <p className="muted">Airing this hour and later · US Eastern time</p>
      {todayItems.length ? <div className="home-live-schedule-grid" style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12}}>{episodeCards(todayItems)}</div> : <p className="panel" style={{padding: 20}}>No more scheduled episodes for the rest of this evening. See the full guide for earlier listings.</p>}
      <p style={{marginTop: 16}}><Link className="view-link" href="/tv-tonight">Explore the full TV Tonight schedule →</Link></p>
    </section>

    <section style={{marginTop: 40}}>
      <div className="accent eyebrow">LOOKING AHEAD</div>
      <h2>Coming up tomorrow</h2>
      <p className="muted">A quick look at tomorrow's scheduled episodes, {nextDate}.</p>
      {nextItems.length ? <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12}}>{episodeCards(nextItems)}</div> : <p className="panel" style={{padding: 20}}>Tomorrow's listings aren't available yet.</p>}
      <p style={{marginTop: 16}}><Link className="view-link" href="/tv-this-week">See the full TV week →</Link></p>
    </section>

    <section className="panel" style={{padding: 28, marginTop: 40}}>
      <div className="accent eyebrow">EXPLORE MORE</div>
      <h2>Find your next favourite show</h2>
      <div className="seo-link-grid">
        <Link href="/new-and-upcoming">New & upcoming series →</Link>
        <Link href="/new-episodes">Latest new episodes →</Link>
        <Link href="/discover">Discover running shows →</Link>
      </div>
    </section>

    <section style={{margin: "40px 0 70px"}}>
      <div className="accent eyebrow">WATCH SMARTER</div>
      <h2>TV tracking tips & guides</h2>
      <p className="muted">Practical advice for organizing a watchlist and making sense of TV schedules.</p>
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 14}}>
        <article className="panel" style={{padding: 24}}><h3>How to keep track of TV shows</h3><p className="muted">Organize the series you're watching and avoid losing track between seasons.</p><Link className="view-link" href="/guides">Read the guide →</Link></article>
        <article className="panel" style={{padding: 24}}><h3>Plan your TV viewing week</h3><p className="muted">Use airing dates and a personal watchlist to plan what to watch next.</p><Link className="view-link" href="/guides">Explore viewing tips →</Link></article>
        <article className="panel" style={{padding: 24}}><h3>Why episodes sometimes go missing</h3><p className="muted">Understand regional schedules, streaming releases and changing air dates.</p><Link className="view-link" href="/guides">Learn more →</Link></article>
      </div>
    </section>
  </main></>;
}
