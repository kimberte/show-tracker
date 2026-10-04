import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const revalidate = 3600;

function label(value:string){return decodeURIComponent(value).replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function slugify(value:string){return value.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}

async function getShows(){
  const pages=await Promise.all(Array.from({length:5},(_,i)=>fetch("https://api.tvmaze.com/shows?page="+i,{next:{revalidate:86400}}).then(r=>r.ok?r.json():[]).catch(()=>[])));
  return pages.flat().filter((s:any)=>s.status==="Running"||s.status==="In Development");
}

export async function generateMetadata({params}:{params:Promise<{service:string}>}):Promise<Metadata>{
  const {service}=await params; const name=label(service);
  return {title:name+" TV Shows — What to Watch | My TV Tracker",description:"Find active and upcoming TV shows on "+name+", with schedules and tracking.",alternates:{canonical:"/streaming/"+service}};
}

export default async function StreamingPage({params}:{params:Promise<{service:string}>}){
  const {service}=await params; const name=label(service);
  const shows=(await getShows()).filter((s:any)=>slugify(s.network?.name||s.webChannel?.name||"")===service).sort((a:any,b:any)=>a.name.localeCompare(b.name));
  return <main className="shell"><SiteNav/><header className="page-header"><div><div className="accent eyebrow">STREAMING & TV</div><h1 className="page-title">{name} TV Shows</h1><p className="muted page-subtitle">Active and upcoming shows from {name}.</p></div></header>
    {shows.length?<div className="home-results-list">{shows.slice(0,100).map((s:any)=><article className="panel home-result-card" key={s.id}>{s.image?.medium&&<Link href={"/shows/"+slugify(s.name)}><img src={s.image.medium} width="70" height="95" alt={s.name}/></Link>}<div className="home-result-info"><h2>{s.name}</h2><p className="muted">{s.genres?.slice(0,2).join(" · ")||"TV"}{s.premiered?" · "+s.premiered.slice(0,4):""}</p><div className="accent">{s.status==="In Development"?"Premieres soon":"Airing"}</div></div><Link href={"/shows/"+slugify(s.name)} className="nav-pill home-view-button">View show</Link></article>)}</div>:<section className="panel empty-state"><h2>No active shows found</h2><p className="muted">Check the spelling or browse TV Tonight.</p><Link href="/tv-tonight" className="accent">TV Tonight →</Link></section>}
    <section className="seo-links panel"><div><div className="accent eyebrow">EXPLORE</div><h2>More TV</h2></div><div className="seo-link-grid"><Link href="/tv-tonight">TV Tonight →</Link><Link href="/new-episodes">New Episodes →</Link><Link href="/discover">Discover Shows →</Link></div></section>
  </main>;
}
