import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";
import DiscoveryFilters, { type GuideEpisode } from "@/components/discovery-lab-filters";

export const revalidate = 3600;
export const metadata: Metadata = { title: "TV Discovery Lab — Review", description: "Review experimental TV schedule discovery features.", robots: { index: false, follow: false } };

function easternDate(offset: number) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone:"America/New_York", year:"numeric",month:"2-digit",day:"2-digit" }).formatToParts(new Date());
  const read = (type: string) => parts.find(p=>p.type===type)?.value || "01";
  const d = new Date(Date.UTC(Number(read("year")),Number(read("month"))-1,Number(read("day"))+offset));
  return d.toISOString().slice(0,10);
}
async function getDay(date: string): Promise<GuideEpisode[]> {
  try {
    const response = await fetch("https://api.tvmaze.com/schedule?country=US&date="+date, { next: { revalidate:3600 }, signal:AbortSignal.timeout(9000) });
    if (!response.ok) return [];
    const items = await response.json();
    return Array.isArray(items) ? items.filter((e:GuideEpisode) => e.show?.id && e.show?.name && e.airdate) : [];
  } catch { return []; }
}
export default async function TvDiscoveryLab() {
  const dates = Array.from({length:7},(_,i)=>easternDate(i));
  const days = await Promise.all(dates.map(getDay));
  const unique = new Map<number,GuideEpisode>();
  for (const e of days.flat()) if (!unique.has(e.id)) unique.set(e.id,e);
  const episodes = [...unique.values()];
  return <main className="shell">
    <SiteNav />
    <header className="page-header"><div><div className="accent eyebrow">REVIEW ONLY · PHASE 2</div><h1 className="page-title">Explore what's on TV</h1><p className="muted page-subtitle">Browse the next seven days of US television schedules. Filter by date, network or show, then open a series to track it.</p></div></header>
    <section className="panel" style={{padding:22,marginTop:20}}><h2 style={{marginTop:0}}>Discover first. Track what matters.</h2><p className="muted">This experimental public guide complements your personal Today and Upcoming rails. It is not a replacement for your tracked shows. Schedules come from TVMaze, may change, and times reflect the broadcaster's listed airtime rather than your device timezone.</p><div style={{display:"flex",gap:14,flexWrap:"wrap"}}><Link href="/today" className="accent">Your shows today →</Link><Link href="/upcoming" className="accent">Your upcoming shows →</Link><Link href="/lab/tv-guides" className="accent">Read the new TV guides →</Link></div></section>
    <DiscoveryFilters episodes={episodes} />
    <section className="panel" style={{padding:24,marginTop:32}}><h2>How to use the TV guide</h2><p className="muted">Select a day to narrow down the schedule, then choose a network or search for a title. Open a show to see its episode details and add it to your personal tracking list. US network schedules and streaming releases are not always the same: a service may publish an entire season at once, or a broadcaster may reschedule an episode.</p><p className="muted">For your own shows, the personalized homepage and upcoming schedule remain the best place to see what you have chosen to follow.</p></section>
    <p className="muted" style={{marginTop:20}}>This is an unindexed review page. Your existing TV Tonight, TV This Week, New Episodes and New & Upcoming pages remain unchanged.</p>
  </main>;
}
