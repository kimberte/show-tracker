"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type GuideEpisode = { id: number; name: string; airdate: string; airtime?: string; season?: number; number?: number; show: { id: number; name: string; image?: { medium?: string }; network?: { name?: string }; webChannel?: { name?: string }; language?: string; genres?: string[] } };
export default function DiscoveryFilters({ episodes }: { episodes: GuideEpisode[] }) {
  const [day, setDay] = useState("all");
  const [query, setQuery] = useState("");
  const [network, setNetwork] = useState("all");
  const [limit, setLimit] = useState(36);
  const days = Array.from(new Set(episodes.map(e => e.airdate))).sort();
  const networks = Array.from(new Set(episodes.map(e => e.show.network?.name || e.show.webChannel?.name || "Other"))).sort();
  const filtered = useMemo(() => episodes.filter(e => (day === "all" || e.airdate === day) && (network === "all" || (e.show.network?.name || e.show.webChannel?.name || "Other") === network) && (e.show.name + " " + e.name).toLowerCase().includes(query.toLowerCase())).sort((a,b) => (a.airdate + (a.airtime || "")).localeCompare(b.airdate + (b.airtime || ""))), [episodes,day,network,query]);
  const formatDate = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
  const formatTime = (t?: string) => { if (!t || !/^\d{2}:\d{2}$/.test(t)) return "Time TBA"; const [h,m] = t.split(":").map(Number); return (h%12||12)+":"+String(m).padStart(2,"0")+(h>=12?" PM":" AM"); };
  return <section>
    <div className="panel" style={{padding:20,display:"flex",flexWrap:"wrap",gap:12,margin:"24px 0"}}>
      <label style={{display:"grid",gap:6,flex:"2 1 180px"}}>Search show or episode<input aria-label="Search shows and episodes" value={query} onChange={e=>{setQuery(e.target.value);setLimit(36);}} placeholder="Search titles..." style={{padding:12,borderRadius:8}} /></label>
      <label style={{display:"grid",gap:6,flex:"1 1 150px"}}>Air date<select value={day} onChange={e=>{setDay(e.target.value);setLimit(36);}} style={{padding:12,borderRadius:8}}><option value="all">Next 7 days</option>{days.map(d=><option key={d} value={d}>{formatDate(d)}</option>)}</select></label>
      <label style={{display:"grid",gap:6,flex:"1 1 150px"}}>Network / service<select value={network} onChange={e=>{setNetwork(e.target.value);setLimit(36);}} style={{padding:12,borderRadius:8}}><option value="all">All networks</option>{networks.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    </div>
    <p className="muted" aria-live="polite">{filtered.length} scheduled episodes match your filters. Times are broadcaster-local and may vary by region.</p>
    {filtered.length === 0 ? <div className="panel" style={{padding:24}}>No scheduled episodes match these filters. Try another date or network.</div> : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:14,marginTop:18}}>
      {filtered.slice(0,limit).map(e=><Link href={"/show/"+e.show.id} key={e.id} className="panel" style={{display:"flex",gap:14,padding:14,textDecoration:"none",color:"inherit"}}>
        {e.show.image?.medium ? <img src={e.show.image.medium} alt="" loading="lazy" width={82} height={116} style={{objectFit:"cover",borderRadius:8,flexShrink:0}}/> : <div style={{width:82,minHeight:116,background:"#262b36",borderRadius:8,flexShrink:0}}/>}
        <div style={{minWidth:0}}><span className="accent eyebrow">{formatDate(e.airdate)} · {formatTime(e.airtime)}</span><h3 style={{margin:"8px 0 6px",fontSize:"1rem"}}>{e.show.name}</h3><p className="muted" style={{margin:"0 0 7px"}}>{e.name || "Episode title TBA"} · S{e.season ?? "?"} E{e.number ?? "?"}</p><small className="muted">{e.show.network?.name || e.show.webChannel?.name || "Network TBA"}</small></div>
      </Link>)}
    </div>}
    {filtered.length>limit && <div style={{textAlign:"center",marginTop:24}}><button className="nav-pill" onClick={()=>setLimit(v=>v+36)}>Show more episodes</button></div>}
  </section>;
}
