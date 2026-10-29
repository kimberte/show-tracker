import type { Metadata } from "next";
import SiteNav from "@/components/site-nav";
import DiscoverV2 from "@/components/discover-v2";
import type { GuideEpisode } from "@/components/discovery-lab-filters";
export const revalidate = 3600;
export const metadata: Metadata = { title: "Discover V2 Preview", robots: { index: false, follow: false } };
async function schedule(date: string): Promise<GuideEpisode[]> {
 try {
  const r = await fetch("https://api.tvmaze.com/schedule?country=US&date="+date,{next:{revalidate:3600},signal:AbortSignal.timeout(8000)});
  if(!r.ok)return [];
  const data = await r.json();
  return Array.isArray(data)?data.filter((e:GuideEpisode)=>e.id&&e.show?.id&&e.airdate):[];
 }catch{return [];}
}
export default async function Page() {
 const now = new Date();
 const dates = Array.from({length:7},(_,i)=>new Date(now.getTime()+i*86400000).toISOString().slice(0,10));
 const days = await Promise.all(dates.map(schedule));
 const unique = new Map<number,GuideEpisode>();
 for(const e of days.flat())if(!unique.has(e.id))unique.set(e.id,e);
 return <main className="shell"><SiteNav/><header className="page-header"><div><div className="accent eyebrow">PREVIEW · DISCOVER V2</div><h1 className="page-title">Discover your next favourite show</h1><p className="muted page-subtitle">Personalized recommendations, shows worth watching and upcoming TV in one place.</p></div></header><DiscoverV2 episodes={[...unique.values()]}/><p className="muted">This preview is not indexed. Existing discovery and homepage routes are unchanged.</p></main>;
}
