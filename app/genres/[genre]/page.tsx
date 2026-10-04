import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;

function label(value: string) { return decodeURIComponent(value).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function slugify(value: string) { return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

async function getShows() {
  const pages = await Promise.all(Array.from({length: 5}, (_, i) =>
    fetch("https://api.tvmaze.com/shows?page=" + i, { next: { revalidate: 86400 } }).then(r => r.ok ? r.json() : []).catch(() => [])
  ));
  return pages.flat().filter((show: any) => show.status === "Running" || show.status === "In Development");
}

export async function generateMetadata({params}:{params:Promise<{genre:string}>}):Promise<Metadata>{
  const {genre}=await params; const name=label(genre);
  return {title:name+" TV Shows — Active & Upcoming Series | My TV Tracker",description:"Browse active and upcoming "+name+" TV shows, see their schedules, and track the series you watch.",alternates:{canonical:"/genres/"+genre}};
}

export default async function GenrePage({params}:{params:Promise<{genre:string}>}) {
  const {genre}=await params; const name=label(genre);
  const shows=(await getShows()).filter((s:any)=>(s.genres||[]).some((g:string)=>slugify(g)===genre)).sort((a:any,b:any)=>a.name.localeCompare(b.name));
  return <main className="shell"><SiteNav /><header className="page-header"><div><div className="accent eyebrow">TV GENRE</div><h1 className="page-title">{name} TV Shows</h1><p className="muted page-subtitle">Active and upcoming {name.toLowerCase()} series to discover and track.</p></div></header>
    {shows.length ? <div className="home-results-list">{shows.slice(0,100).map((s:any)=><article className="panel home-result-card" key={s.id}>{s.image?.medium && <Link href={"/shows/"+slugify(s.name)}><img src={s.image.medium} width="70" height="95" alt={s.name}/></Link>}<div className="home-result-info"><h2>{s.name}</h2><p className="muted">{s.network?.name||s.webChannel?.name||"TV"}{s.premiered?" · "+s.premiered.slice(0,4):""}</p><div className="accent">{s.status==="In Development"?"Premieres soon":"Airing"}</div></div><Link href={"/shows/"+slugify(s.name)} className="nav-pill home-view-button">View show</Link></article>)}</div> : <section className="panel empty-state"><h2>No active shows found</h2><p className="muted">Try another genre.</p></section>}
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE</div><h2>More TV</h2></div><div className="seo-link-grid"><Link href="/tv-tonight">TV Tonight →</Link><Link href="/tv-this-week">TV This Week →</Link><Link href="/new-episodes">New Episodes →</Link></div></section>
  </main>;
}
