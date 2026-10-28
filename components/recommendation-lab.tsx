"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import { getSupabase } from "@/lib/supabase";

type Show = { id:number; name:string; genres?:string[]; summary?:string|null; language?:string|null; status?:string|null; rating?:{average?:number|null}; weight?:number; image?:{medium?:string;original?:string}|null; network?:{name?:string;country?:{name?:string}}|null; webChannel?:{name?:string;country?:{name?:string}}|null; _nextAirdate?:string|null };
const clean = (s?:string|null) => (s||"").replace(/<[^>]+>/g," ").replace(/&[^;]+;/g," ").replace(/\s+/g," ").trim();
const tokens = (s:string) => new Set(clean(s).toLowerCase().split(/[^a-z]+/).filter(w=>w.length>4&&!["about","their","these","which","after","before","where","while","there","series","story","shows","young","world","family"].includes(w)));
function rank(candidate:Show, liked:Show[]) {
 const candidateWords=tokens(candidate.summary||"");
 let best=0, reason="";
 for(const seed of liked) {
  const shared=(candidate.genres||[]).filter(g=>(seed.genres||[]).includes(g));
  const overlap=[...tokens(seed.summary||"")].filter(w=>candidateWords.has(w)).length;
  const score=shared.length*6+Math.min(overlap,4)*1.5+(seed.language===candidate.language?1:0);
  if(score>best) {best=score;reason=shared.length?shared.slice(0,2).join(" + ")+" themes":overlap?"Similar story themes":"Similar viewing interests";}
 }
 return {score:best+(candidate.rating?.average||0)*.15+(candidate.weight||0)*.002,reason};
}
export default function RecommendationLab() {
 const [selected,setSelected]=useState<Show[]>([]);
 const [query,setQuery]=useState("");
 const [searchResults,setSearchResults]=useState<Show[]>([]);
 const [candidates,setCandidates]=useState<Show[]>([]);
 const [tracked,setTracked]=useState<Show[]>([]);
 const [signedIn,setSignedIn]=useState(false);
 const [loading,setLoading]=useState(true);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState("");
 const [mode,setMode]=useState<"tracked"|"pick">("pick");
 const [showMore,setShowMore]=useState(false);
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const r=await fetch("/api/discover");
    if(!r.ok)throw new Error("Recommendations are temporarily unavailable.");
    const data=await r.json();if(active)setCandidates(Array.isArray(data)?data:[]);
   }catch(e){if(active)setError(e instanceof Error?e.message:"Could not load shows.");}
   try{
    const supabase=getSupabase();
    const {data:{user}}=await supabase.auth.getUser();
    if(user){
     const {data:rows,error:dbError}=await supabase.from("tracked_shows").select("show:shows(tvmaze_id,title)").eq("user_id",user.id);
     if(dbError)throw dbError;
     const ids=(rows||[]).map((row:any)=>Number((Array.isArray(row.show)?row.show[0]:row.show)?.tvmaze_id)).filter(Boolean);
     const loaded=await Promise.all(ids.slice(0,35).map(async(id:number)=>{
      try{const r=await fetch("/api/lab/recommendation-show?id="+id);return r.ok?await r.json():null;}catch{return null;}
     }));
     if(active){setSignedIn(true);setTracked(loaded.filter(Boolean));if(ids.length)setMode("tracked");}
    }
   }catch{ /* Guests can still choose shows. */ }
   if(active)setLoading(false);
  }
  load();return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(query.trim().length<2){setSearchResults([]);setSearching(false);return;}
  const controller=new AbortController();setSearching(true);
  const t=setTimeout(()=>{fetch("/api/lab/recommendation-search?q="+encodeURIComponent(query.trim()),{signal:controller.signal}).then(r=>r.ok?r.json():[]).then(d=>setSearchResults(d)).catch(()=>{}).finally(()=>setSearching(false));},300);
  return()=>{clearTimeout(t);controller.abort()};
 },[query]);
 const seeds=mode==="tracked"?tracked:selected;
 const recommendations=useMemo(()=>{
  if(!seeds.length)return [];
  const excluded=new Set([...tracked,...selected].map(s=>s.id));
  return candidates.filter(s=>!excluded.has(s.id)&&s.language==="English"&&(s.genres||[]).length>0)
   .map(s=>({...s,...rank(s,seeds)})).filter(s=>s.score>=5)
   .sort((a,b)=>b.score-a.score).slice(0,showMore?36:12);
 },[candidates,seeds,selected,tracked,showMore]);
 return <div style={{display:"grid",gap:22,margin:"22px 0 44px"}}>
  <section className="panel" style={{padding:24}}>
   <h2 style={{marginTop:0}}>How should we find your next show?</h2>
   <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:18}}>
    {signedIn&&<button type="button" onClick={()=>{setMode("tracked");setShowMore(false)}} className="nav-pill" style={{border:mode==="tracked"?"2px solid #f59e0b":"1px solid #777",padding:"10px 16px",cursor:"pointer"}}>Based on My Shows ({tracked.length})</button>}
    <button type="button" onClick={()=>{setMode("pick");setShowMore(false)}} className="nav-pill" style={{border:mode==="pick"?"2px solid #f59e0b":"1px solid #777",padding:"10px 16px",cursor:"pointer"}}>Choose shows I love</button>
   </div>
   {mode==="pick"?<div>
    <p className="muted">Search and select 3–5 favourites. No account required.</p>
    <input aria-label="Search favourite TV shows" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a show, e.g. Breaking Bad" style={{width:"100%",maxWidth:520,padding:13,borderRadius:10,border:"1px solid #777",background:"var(--panel)",color:"inherit"}}/>
    {searching&&<p className="muted">Searching…</p>}
    {query.length>=2&&<div style={{display:"grid",gap:6,maxWidth:600,marginTop:10}}>{searchResults.filter(s=>!selected.some(x=>x.id===s.id)).slice(0,8).map(s=><button key={s.id} type="button" onClick={()=>{setSelected(a=>[...a,s]);setQuery("");setSearchResults([]);setShowMore(false)}} style={{display:"flex",gap:12,alignItems:"center",textAlign:"left",padding:9,border:"1px solid var(--line)",borderRadius:9,background:"var(--panel)",color:"inherit",cursor:"pointer"}}>{s.image?.medium&&<img src={s.image.medium} alt="" width={32} height={44} style={{objectFit:"cover",borderRadius:4}}/>}<span>{s.name} <span className="muted">· {(s.genres||[]).slice(0,2).join(", ")}</span></span><strong style={{marginLeft:"auto"}}>+ Add</strong></button>)}</div>}
    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>{selected.map(s=><button type="button" key={s.id} onClick={()=>setSelected(a=>a.filter(x=>x.id!==s.id))} style={{padding:"9px 12px",border:"1px solid #f59e0b",borderRadius:30,background:"var(--panel)",color:"inherit",cursor:"pointer"}}>{s.name} ×</button>)}</div>
   </div>:<p className="muted">Using your tracked series to find related shows. Already-tracked titles are excluded from results. <Link href="/my-shows" className="accent">Manage My Shows</Link></p>}
   {loading&&<p className="muted">Loading your shows and recommendations…</p>}
   {error&&<p role="alert" className="muted">{error}</p>}
  </section>
  <section>
   <h2>{seeds.length?"Recommended for you":"Your recommendations will appear here"}</h2>
   {!seeds.length&&<p className="muted">{mode==="tracked"?"No tracked shows were found. Choose a few favourites instead.":"Pick a few shows above to start discovering similar series."}</p>}
   {!!seeds.length&&!loading&&<p className="muted">Based on {seeds.length} {seeds.length===1?"show":"shows"} you like. Matching genres and story themes; results are suggestions, not viewing-history predictions.</p>}
   {!!seeds.length&&!loading&&!recommendations.length&&<p className="muted">No close matches in our current discovery catalogue. Try choosing shows with different genres.</p>}
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16}}>
    {recommendations.map(s=><article key={s.id} className="panel" style={{padding:12,display:"flex",flexDirection:"column",gap:9}}>
     <Link href={"/show/"+s.id} style={{textDecoration:"none",color:"inherit"}}>{s.image?.medium?<img src={s.image.original||s.image.medium} alt={s.name+" poster"} loading="lazy" style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",borderRadius:10}}/>:<div style={{aspectRatio:"2/3",display:"grid",placeItems:"center",background:"#1b2635",borderRadius:10}}>No poster</div>}<h3 style={{margin:"10px 0 0",fontSize:17}}>{s.name}</h3></Link>
     <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>Because you like {s.reason}</div>
     <p className="muted" style={{fontSize:13,lineHeight:1.5,margin:0,flex:1}}>{clean(s.summary).slice(0,145)}{clean(s.summary).length>145?"…":""}</p>
     <div style={{fontSize:12}}>{(s.genres||[]).slice(0,3).join(" · ")}</div>
     <TrackButton showId={s.id} title={s.name} compact/>
    </article>)}
   </div>
   {recommendations.length>=12&&!showMore&&<button type="button" onClick={()=>setShowMore(true)} className="nav-pill" style={{marginTop:20,padding:12,cursor:"pointer"}}>Show more recommendations</button>}
  </section>
  <p className="muted" style={{fontSize:13}}>Experimental recommendation engine · Powered by TVMaze show metadata. The candidate pool currently prioritizes shows in the public discovery catalogue, not every show ever produced. No favourite-show selections are saved to your account.</p>
 </div>;
}
