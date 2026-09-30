"use client";
import{useEffect,useState}from"react";import Link from"next/link";import{getSupabase}from"@/lib/supabase";
type Show={tvmaze_id:number;title:string;poster_url?:string|null;network?:string|null};
type Tracked={id:number;show:Show|null};
type Episode={id:number;season:number;number:number;name:string;airdate?:string|null;airtime?:string|null;runtime?:number|null;summary?:string|null};
type Item={trackedId:number;show:Show;episode:Episode};

function clean(t:string){return t.replace(/<[^>]*>/g,"").trim()}

export default function Today(){
 const[items,setItems]=useState<Item[]>([]);const[loading,setLoading]=useState(true);const[message,setMessage]=useState("");
 useEffect(()=>{async function load(){const supabase=getSupabase();const{data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return}
  const{data,error}=await supabase.from("tracked_shows").select("id,show:shows(tvmaze_id,title,poster_url,network)").eq("user_id",user.id);if(error){setMessage(error.message);setLoading(false);return}
  const list=(data||[]) as unknown as Tracked[];const today=new Date().toLocaleDateString("en-CA");const found:Item[]=[];
  await Promise.all(list.map(async item=>{if(!item.show)return;try{const r=await fetch("https://api.tvmaze.com/shows/"+item.show.tvmaze_id+"?embed[]=episodes");if(!r.ok)return;const s=await r.json();for(const e of (s._embedded?.episodes||[]) as Episode[]){if(e.airdate===today)found.push({trackedId:item.id,show:item.show,episode:e})}}catch{}}));
  found.sort((a,b)=>(a.episode.airtime||"99:99").localeCompare(b.episode.airtime||"99:99"));setItems(found);setLoading(false)
 }load()},[]);
 return <main className="shell"><header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,marginBottom:32}}><div><Link href="/" className="muted">← Show Tracker</Link><h1 style={{marginBottom:6}}>Today</h1><p className="muted" style={{margin:0}}>Episodes airing today from your tracked shows.</p></div><nav style={{display:"flex",gap:10}}><Link className="panel" style={{padding:"10px 14px"}} href="/my-shows">My Shows</Link><Link className="panel" style={{padding:"10px 14px"}} href="/discover">Discover</Link></nav></header>
 {loading?<p className="muted">Checking your shows…</p>:items.length===0?<section className="panel" style={{padding:24}}><h2>Nothing airing today</h2><p className="muted">You don't have a tracked episode airing today.</p><Link href="/my-shows" className="accent">View My Shows →</Link></section>:<section style={{display:"grid",gap:14}}>{items.map(item=><article key={item.trackedId+"-"+item.episode.id} className="panel" style={{padding:18,display:"flex",gap:16,alignItems:"center"}}>{item.show.poster_url&&<img src={item.show.poster_url} width="78" height="108" style={{objectFit:"cover",borderRadius:10,flexShrink:0}} alt=""/>}<div style={{flex:1,minWidth:0}}><div className="accent" style={{fontWeight:800,fontSize:13,letterSpacing:.5}}>{item.episode.airtime||"TIME TBA"}</div><h2 style={{margin:"5px 0 5px",fontSize:21}}>{item.episode.name}</h2><div className="muted">{item.show.title} · S{item.episode.season} E{item.episode.number}{item.episode.runtime?" · "+item.episode.runtime+" min":""}</div>{item.episode.summary&&<p className="muted" style={{lineHeight:1.5,margin:"10px 0 0"}}>{clean(item.episode.summary)}</p>}<Link href={"/show/"+item.show.tvmaze_id} className="accent" style={{display:"inline-block",marginTop:10}}>View show →</Link></div></article>)}</section>}
 </main>
}