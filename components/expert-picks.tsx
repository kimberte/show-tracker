"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import TvBotLoader from "@/components/tv-bot-loader";

// TVMaze IDs are pinned to prevent similarly named series being selected.
// Editorial review: 2026-11-02. All titles premiered by this date.
const picks=[
 {id:64960,name:"Crystal Lake",query:"Crystal Lake",note:"Full season · Horror"},
 {id:75026,name:"MobLand",query:"MobLand",note:"New episodes · Crime"},
 {id:66811,name:"Nocturne",query:"Nocturne",note:"New series · Thriller"},
 {id:64950,name:"VisionQuest",query:"VisionQuest",note:"New episodes · Sci-fi"},
 {id:78665,name:"Dexter: Resurrection",query:"Dexter: Resurrection",note:"New season · Crime"},
 {id:34685,name:"The Gilded Age",query:"The Gilded Age",note:"Season 4 · Period drama"},
 {id:60213,name:"The Diplomat",query:"The Diplomat",note:"New season · Thriller"},
 {id:45562,name:"Carrie",query:"Carrie",note:"New series · Horror"},
 {id:61315,name:"Dark Matter",query:"Dark Matter",note:"Season 2 · Sci-fi"},
 {id:45039,name:"Slow Horses",query:"Slow Horses",note:"Season 6 · Spy drama"}
];
type Show={id:number;name:string;premiered?:string|null;image?:{medium?:string;original?:string}|null;status?:string|null};
const normalized=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,"");
export default function ExpertPicks(){
 const [shows,setShows]=useState<(Show|null)[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;
  async function load(){
   const result:(Show|null)[]=Array(picks.length).fill(null);
   // Small batches avoid hammering TVMaze through the search endpoint.
   for(let start=0;start<picks.length;start+=2){
    if(!active)break;
    await Promise.all(picks.slice(start,start+2).map(async(p,offset)=>{
     try{
      const r=await fetch("/api/search?q="+encodeURIComponent(p.query));
      if(!r.ok)return;
      const data=await r.json();
      if(!Array.isArray(data))return;
      result[start+offset]=(data as Show[]).find(s=>s.id===p.id && normalized(s.name)===normalized(p.name) && !!s.premiered && s.premiered<=new Date().toISOString().slice(0,10))||null;
     }catch{/* Keep already loaded picks visible. */}
    }));
    if(active){setShows([...result]);setLoading(false);}
   }
   if(active)setLoading(false);
  }
  void load();
  return()=>{active=false};
 },[]);
 const visible=picks.map((pick,i)=>({...pick,show:shows[i]})).filter(p=>p.show?.id);
 return <section className="expert-picks-section" aria-labelledby="expert-picks-heading">
  <div className="section-heading">
   <div><div className="accent eyebrow">HANDPICKED FOR YOUR WATCHLIST</div><h2 id="expert-picks-heading">My TV Tracker Expert Picks</h2><p className="muted">10 shows worth watching right now.</p></div>
  </div>
  {loading?<TvBotLoader label="Picking tonight’s favourites…"/>:visible.length?
   <div className="expert-picks-rail">
    {visible.map(({show,note},i)=><Link key={show!.id} href={"/show/"+show!.id} className="expert-pick-card" aria-label={"View "+show!.name}>
     <div className="expert-pick-poster">{show!.image?.medium||show!.image?.original?<img src={show!.image?.medium||show!.image?.original} alt="" loading="lazy"/>:<div className="expert-pick-placeholder">TV</div>}<span className="expert-pick-rank">{String(i+1).padStart(2,"0")}</span></div>
     <strong>{show!.name}</strong><span className="muted">{note}{show!.premiered?" · "+show!.premiered.slice(0,4):""}</span>
    </Link>)}
   </div>:<p className="muted">Expert picks are temporarily unavailable. Check back shortly.</p>}
 </section>;
}
