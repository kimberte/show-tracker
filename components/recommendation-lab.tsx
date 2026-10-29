"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TrackButton from "@/components/track-button";
import { getSupabase } from "@/lib/supabase";

type Show = { id:number; name:string; premiered?:string|null; genres?:string[]; summary?:string|null; language?:string|null; status?:string|null; rating?:{average?:number|null}; weight?:number; image?:{medium?:string;original?:string}|null; network?:{name?:string;country?:{name?:string}}|null; webChannel?:{name?:string;country?:{name?:string}}|null; _nextAirdate?:string|null };
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
 const [yearFilter,setYearFilter]=useState("all");
 const [hidden,setHidden]=useState<{id:number;name:string}[]>([]);
 const [lastHidden,setLastHidden]=useState<{id:number;name:string}|null>(null);
 const [showHidden,setShowHidden]=useState(false);
 const [feedback,setFeedback]=useState("");
 const [hiddenLoaded,setHiddenLoaded]=useState(false);
 const [refreshCycle,setRefreshCycle]=useState(0);
 useEffect(()=>{try{const key="mytvtracker:recommendation-visits";const count=Number(localStorage.getItem(key)||"0")+1;localStorage.setItem(key,String(count));setRefreshCycle(Math.floor(count/5));}catch{}},[]);
 useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem("mytvtracker:recommendation-hidden")||"[]");if(Array.isArray(stored))setHidden(stored.filter(x=>Number.isInteger(x.id)&&typeof x.name==="string"));}catch{}setHiddenLoaded(true)},[]);
 async function dismiss(show:Show) {
  const next=[...hidden.filter(x=>x.id!==show.id),{id:show.id,name:show.name}];
  setHidden(next);setLastHidden({id:show.id,name:show.name});setFeedback("");
  if(signedIn){
   const db=getSupabase();const {data:{user}}=await db.auth.getUser();
   if(user){const {error}=await db.from("recommendation_dismissals").upsert({user_id:user.id,tvmaze_show_id:show.id,show_title:show.name},{onConflict:"user_id,tvmaze_show_id"});
    if(error){setHidden(hidden);setLastHidden(null);setFeedback("Could not save your dismissal. Please try again.");}}
  }else{localStorage.setItem("mytvtracker:recommendation-hidden",JSON.stringify(next));}
 }
 async function restore(show:{id:number;name:string}) {
  const previous=hidden;setHidden(a=>a.filter(x=>x.id!==show.id));setLastHidden(null);setFeedback("");
  if(signedIn){
   const db=getSupabase();const {data:{user}}=await db.auth.getUser();
   if(user){const {error}=await db.from("recommendation_dismissals").delete().eq("user_id",user.id).eq("tvmaze_show_id",show.id);
    if(error){setHidden(previous);setFeedback("Could not restore this show. Please try again.");}}
  }else{localStorage.setItem("mytvtracker:recommendation-hidden",JSON.stringify(previous.filter(x=>x.id!==show.id)));}
 }
 useEffect(()=>{
  let active=true;
  async function load(){
   try{
    const r=await fetch("/api/discover"+(refreshCycle>0?"?refresh="+refreshCycle:""),{cache:"no-store"});
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
     const {data:excluded,error:excludedError}=await supabase.from("recommendation_dismissals").select("tvmaze_show_id,show_title").eq("user_id",user.id);
     if(active){setSignedIn(true);setTracked(loaded.filter(Boolean));if(ids.length)setMode("tracked");if(!excludedError)setHidden((excluded||[]).map((x:any)=>({id:Number(x.tvmaze_show_id),name:x.show_title||"Unknown show"})));else setFeedback("Could not load saved hidden shows.");}
    }
   }catch{ /* Guests can still choose shows. */ }
   if(active)setLoading(false);
  }
  load();return()=>{active=false};
 },[refreshCycle]);
 useEffect(()=>{
  if(query.trim().length<2){setSearchResults([]);setSearching(false);return;}
  const controller=new AbortController();setSearching(true);
  const t=setTimeout(()=>{fetch("/api/lab/recommendation-search?q="+encodeURIComponent(query.trim()),{signal:controller.signal}).then(r=>r.ok?r.json():[]).then(d=>setSearchResults(d)).catch(()=>{}).finally(()=>setSearching(false));},300);
  return()=>{clearTimeout(t);controller.abort()};
 },[query]);
 const seeds=mode==="tracked"?tracked:selected;
 const recommendations=useMemo(()=>{
  if(!seeds.length)return [];
  const excluded=new Set([...tracked,...selected,...hidden].map(s=>s.id));
  return candidates.filter(s=>!excluded.has(s.id)&&s.language==="English"&&(s.genres||[]).length>0&&(yearFilter==="all"||(s.premiered&&Number(s.premiered.slice(0,4))>=Number(yearFilter))))
   .map(s=>({...s,...rank(s,seeds)})).filter(s=>s.score>=5)
   .sort((a,b)=>((b.score+(refreshCycle%4)*((b.id%7)/20))-(a.score+(refreshCycle%4)*((a.id%7)/20)))).slice(0,showMore?36:12);
 },[candidates,seeds,selected,tracked,hidden,showMore,refreshCycle,yearFilter]);
 return <div style={{display:"grid",gap:22,margin:"22px 0 44px"}}>
  <section className="panel" style={{padding:24}}>
   <h2 style={{marginTop:0}}>How should we find your next show?</h2>
   <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:18}}>
    {signedIn&&<button type="button" onClick={()=>{setMode("tracked");setShowMore(false)}} className="nav-pill" style={{border:mode==="tracked"?"2px solid #f59e0b":"1px solid #777",padding:"10px 16px",cursor:"pointer"}}>Based on Shows I’m Watching Now ({tracked.length})</button>}
    <button type="button" onClick={()=>{setMode("pick");setShowMore(false)}} className="nav-pill" style={{border:mode==="pick"?"2px solid #f59e0b":"1px solid #777",padding:"10px 16px",cursor:"pointer"}}>Based on Shows I Love(d)</button>
   </div>
   {mode==="pick"?<div>
    <p className="muted">Choose 3–5 shows you love or loved, including series that have ended. These are taste preferences, not shows you’re tracking.</p>
    <input aria-label="Search favourite TV shows" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search a show, e.g. Breaking Bad" style={{width:"100%",maxWidth:520,padding:13,borderRadius:10,border:"1px solid #777",background:"var(--panel)",color:"inherit"}}/>
    {searching&&<p className="muted">Searching…</p>}
    {query.length>=2&&<div style={{display:"grid",gap:6,maxWidth:600,marginTop:10}}>{searchResults.filter(s=>!selected.some(x=>x.id===s.id)).slice(0,8).map(s=><button key={s.id} type="button" onClick={()=>{setSelected(a=>[...a,s]);setQuery("");setSearchResults([]);setShowMore(false)}} style={{display:"flex",gap:12,alignItems:"center",textAlign:"left",padding:9,border:"1px solid var(--line)",borderRadius:9,background:"var(--panel)",color:"inherit",cursor:"pointer"}}>{s.image?.medium&&<img src={s.image.medium} alt="" width={32} height={44} style={{objectFit:"cover",borderRadius:4}}/>}<span>{s.name} <span className="muted">· {(s.genres||[]).slice(0,2).join(", ")}</span></span><strong style={{marginLeft:"auto"}}>+ Add</strong></button>)}</div>}
    {selected.length>0&&<p className="muted" style={{fontSize:13,marginTop:12}}>These picks are just for recommendations — they won’t be added to My Shows. Want alerts and episode tracking for a currently airing series? <Link href="/login" className="accent">Sign in or create an account</Link> and track it from its show page.</p>}
    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:16}}>{selected.map(s=><button type="button" key={s.id} onClick={()=>setSelected(a=>a.filter(x=>x.id!==s.id))} style={{padding:"9px 12px",border:"1px solid #f59e0b",borderRadius:30,background:"var(--panel)",color:"inherit",cursor:"pointer"}}>{s.name} ×</button>)}</div>
   </div>:<p className="muted">Using shows you currently track to find related series. Already-tracked titles are excluded from results. <Link href="/my-shows" className="accent">Manage My Shows</Link></p>}
   {loading&&<p className="muted">Loading your shows and recommendations…</p>}
   {error&&<p role="alert" className="muted">{error}</p>}
  </section>
  <section>
   <h2>{seeds.length?"Recommended for you":"Your recommendations will appear here"}</h2>
   {lastHidden&&<p role="status" className="muted">Hidden <strong>{lastHidden.name}</strong>. <button type="button" onClick={()=>restore(lastHidden)} className="accent" style={{background:"none",border:0,cursor:"pointer",fontWeight:800}}>Undo</button></p>}
   {feedback&&<p role="alert" className="muted">{feedback}</p>}
   {hiddenLoaded&&hidden.length>0&&<div style={{marginBottom:18}}><button type="button" onClick={()=>setShowHidden(v=>!v)} className="nav-pill" style={{padding:"9px 13px",cursor:"pointer"}}>{showHidden?"Hide list":"Manage hidden shows"} ({hidden.length})</button>
    {showHidden&&<div className="panel" style={{marginTop:10,padding:15,display:"flex",gap:10,flexWrap:"wrap"}}>{hidden.map(s=><button type="button" key={s.id} onClick={()=>restore(s)} style={{padding:"9px 12px",border:"1px solid var(--line)",borderRadius:9,background:"var(--panel)",color:"inherit",cursor:"pointer"}}>{s.name} · Restore</button>)}</div>}</div>}
   {!seeds.length&&<p className="muted">{mode==="tracked"?"No tracked shows were found. Choose a few favourites instead.":"Choose shows you love or loved above to discover similar series — whether they are still airing or have ended."}</p>}
   {!!seeds.length&&!loading&&<p className="muted">Based on {seeds.length} {seeds.length===1?"show":"shows"} you like. Matching genres and story themes. We refresh the mix every fifth visit, while keeping dismissed titles hidden.</p>}
   {!!seeds.length&&!loading&&!recommendations.length&&<p className="muted">No close matches in our current discovery catalogue. Try choosing shows with different genres.</p>}
   <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",margin:"14px 0 20px"}}><label htmlFor="recommendation-year" className="muted">Originally premiered</label><select id="recommendation-year" value={yearFilter} onChange={e=>{setYearFilter(e.target.value);setShowMore(false)}} style={{padding:"10px 12px",borderRadius:9}}><option value="all">Any year</option><option value="2020">2020 or newer</option><option value="2023">2023 or newer</option><option value="2025">2025 or newer</option></select></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16}}>
    {recommendations.map(s=><article key={s.id} className="panel" style={{padding:12,display:"flex",flexDirection:"column",gap:9}}>
     <Link href={"/show/"+s.id} style={{textDecoration:"none",color:"inherit"}}>{s.image?.medium?<img src={s.image.original||s.image.medium} alt={s.name+" poster"} loading="lazy" style={{width:"100%",aspectRatio:"2/3",objectFit:"cover",borderRadius:10}}/>:<div style={{aspectRatio:"2/3",display:"grid",placeItems:"center",background:"#1b2635",borderRadius:10}}>No poster</div>}<h3 style={{margin:"10px 0 0",fontSize:17}}>{s.name}</h3><span className="muted" style={{display:"block",fontSize:13,marginTop:4}}>First aired: {s.premiered?.slice(0,4)||"Year unknown"}</span></Link>
     <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>Because you like {s.reason}</div>
     <p className="muted" style={{fontSize:13,lineHeight:1.5,margin:0,flex:1}}>{clean(s.summary).slice(0,145)}{clean(s.summary).length>145?"…":""}</p>
     <div style={{fontSize:12}}>{(s.genres||[]).slice(0,3).join(" · ")}</div>
     <TrackButton showId={s.id} title={s.name} compact/><button type="button" onClick={()=>dismiss(s)} aria-label={"Not interested in "+s.name} style={{padding:"9px 12px",border:"1px solid var(--line)",borderRadius:9,background:"transparent",color:"inherit",cursor:"pointer",fontWeight:700}}>✕ Not interested</button>
    </article>)}
   </div>
   {recommendations.length>=12&&!showMore&&<button type="button" onClick={()=>setShowMore(true)} className="nav-pill" style={{marginTop:20,padding:12,cursor:"pointer"}}>Show more recommendations</button>}
  </section>
  <p className="muted" style={{fontSize:13}}>Experimental recommendation engine · Powered by TVMaze show metadata. The candidate pool currently prioritizes shows in the public discovery catalogue, not every show ever produced. No favourite-show selections are saved to your account. Hidden shows are saved to your account when signed in, or locally in this browser for guests.</p>
 </div>;
}
