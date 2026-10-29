"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import RecommendationLab from "@/components/recommendation-lab";
import DiscoveryFilters,{type GuideEpisode} from "@/components/discovery-lab-filters";
type Show={id:number;name:string;genres?:string[];language?:string;image?:{medium?:string}|null;network?:{name?:string}|null;webChannel?:{name?:string}|null;_nextAirdate?:string|null;status?:string};
export default function DiscoverV2({episodes}:{episodes:GuideEpisode[]}){
 const [tab,setTab]=useState<"for-you"|"browse"|"schedule">("for-you");
 const [shows,setShows]=useState<Show[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [q,setQ]=useState("");
 const [genre,setGenre]=useState("All");
 const [airing,setAiring]=useState("All");
 const [limit,setLimit]=useState(36);
 useEffect(()=>{if(tab!=="browse"||shows.length)return;let active=true;setLoading(true);fetch("/api/discover").then(r=>{if(!r.ok)throw Error("Could not load the show catalogue");return r.json()}).then(data=>{if(active)setShows(Array.isArray(data)?data:[])}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[tab,shows.length]);
 const genres=useMemo(()=>["All",...Array.from(new Set(shows.flatMap(s=>s.genres||[]))).sort()], [shows]);
 const filtered=useMemo(()=>shows.filter(s=>s.language==="English"&&(genre==="All"||s.genres?.includes(genre))&&(airing==="All"||(airing==="Airing soon"?!!s._nextAirdate:!s._nextAirdate))&&(!q.trim()||(s.name+" "+(s.network?.name||s.webChannel?.name||"")).toLowerCase().includes(q.trim().toLowerCase()))),[shows,genre,airing,q]);
 const tabs=[{id:"for-you",title:"Recommendations",sub:"Find your next favourite"},{id:"browse",title:"Browse shows",sub:"Explore by genre and title"},{id:"schedule",title:"TV schedule",sub:"What's airing this week"}] as const;
 return <div style={{paddingBottom:50}}>
 <div role="tablist" aria-label="Discover TV" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,margin:"24px 0"}}>
 {tabs.map(t=><button key={t.id} type="button" role="tab" aria-selected={tab===t.id} onClick={()=>setTab(t.id)} style={{textAlign:"left",padding:"17px 18px",borderRadius:14,border:tab===t.id?"2px solid var(--accent)":"1px solid var(--line)",background:"var(--panel)",color:"inherit",cursor:"pointer",boxShadow:tab===t.id?"0 0 0 1px rgba(255,150,0,.15)":"none"}}><strong style={{display:"block",fontSize:17}}>{t.title}</strong><span className="muted" style={{fontSize:13}}>{t.sub}</span></button>)}
 </div>
 <div role="tabpanel">
 {tab==="for-you"&&<><section className="panel" style={{padding:"18px 22px",marginBottom:12}}><div className="accent eyebrow">MADE FOR YOUR TASTE</div><h2 style={{margin:"8px 0"}}>Better suggestions, less scrolling</h2><p className="muted" style={{margin:0}}>Start with shows you're watching or pick favourites from any era. Hide suggestions you don't like and we'll remember them.</p></section><RecommendationLab/></>}
 {tab==="browse"&&<section><div className="panel" style={{padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
 <label style={{display:"grid",gap:7}}>Search shows<input value={q} onChange={e=>{setQ(e.target.value);setLimit(36)}} placeholder="Title or network" style={{padding:12,borderRadius:9}}/></label>
 <label style={{display:"grid",gap:7}}>Genre<select value={genre} onChange={e=>{setGenre(e.target.value);setLimit(36)}} style={{padding:12,borderRadius:9}}>{genres.map(g=><option key={g}>{g}</option>)}</select></label>
 <label style={{display:"grid",gap:7}}>Availability<select value={airing} onChange={e=>{setAiring(e.target.value);setLimit(36)}} style={{padding:12,borderRadius:9}}><option value="All">All airing statuses</option><option value="Airing soon">Airing soon</option><option value="On hiatus">No upcoming episode</option></select></label>
 </div><p className="muted" style={{marginTop:15}}>Browsing English-language series in our discovery catalogue. For a broader search, use the site's main show search.</p>
 {loading&&<p role="status">Loading shows…</p>}{error&&<p role="alert">{error}</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:16,marginTop:18}}>{filtered.slice(0,limit).map(s=><Link href={"/show/"+s.id} key={s.id} className="panel" style={{padding:10,color:"inherit",textDecoration:"none"}}>{s.image?.medium?<img src={s.image.medium} alt={s.name+" poster"} loading="lazy" style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",borderRadius:9}}/>:<div style={{aspectRatio:"2/3",background:"#202431",borderRadius:9}}/>}<h3 style={{fontSize:15,margin:"9px 0 4px"}}>{s.name}</h3><p className="muted" style={{fontSize:12,margin:0}}>{(s.genres||[]).slice(0,2).join(" · ")}</p></Link>)}</div>
 {!loading&&!error&&filtered.length===0&&<p className="muted">No shows match those filters.</p>}
 {filtered.length>limit&&<button className="nav-pill" style={{padding:12,marginTop:20,cursor:"pointer"}} onClick={()=>setLimit(v=>v+36)}>Load more shows</button>}
 </section>}
 {tab==="schedule"&&<section><div className="panel" style={{padding:20}}><h2 style={{marginTop:0}}>What's airing over the next 7 days</h2><p className="muted" style={{marginBottom:0}}>Search US broadcast and streaming episode listings. Airtimes are listed in each broadcaster's local time.</p></div><DiscoveryFilters episodes={episodes}/><p className="muted">Looking for your own schedule? <Link className="accent" href="/upcoming">View your tracked upcoming episodes</Link>.</p></section>}
 </div>
 </div>;
}
