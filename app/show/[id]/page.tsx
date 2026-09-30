import Link from"next/link";
import TrackButton from"@/components/track-button";

async function getShow(id:string){
 const r=await fetch("https://api.tvmaze.com/shows/"+id+"?embed[]=episodes&embed[]=cast",{next:{revalidate:3600}});
 if(!r.ok)return null;
 return r.json();
}
function clean(text:string){return text.replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").trim()}
export default async function ShowPage({params}:{params:Promise<{id:string}>}){
 const{id}=await params;const s=await getShow(id);
 if(!s)return <main className="shell"><Link href="/" className="muted">← Show Tracker</Link><h1>Show not found</h1></main>;
 const episodes=s._embedded?.episodes||[];
 const upcoming=episodes.filter((e:any)=>e.airdate&&new Date(e.airdate+"T23:59:59")>=new Date()).sort((a:any,b:any)=>new Date(a.airdate).getTime()-new Date(b.airdate).getTime()).slice(0,8);
 const recent=episodes.filter((e:any)=>!upcoming.some((u:any)=>u.id===e.id)).slice(-5).reverse();
 const cast=(s._embedded?.cast||[]).slice(0,6);
 const network=s.network?.name||s.webChannel?.name||"TV";
 return <main className="shell">
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:18}}><Link href="/my-shows" className="muted">← My Shows</Link><Link href="/" className="muted">Search</Link></div>
  <section className="panel" style={{overflow:"hidden"}}>
   <div style={{display:"grid",gridTemplateColumns:"minmax(180px,260px) 1fr",gap:28,padding:28}}>
    {s.image?.original?<img src={s.image.original} width="260" height="370" style={{width:"100%",height:"auto",maxHeight:380,objectFit:"cover",borderRadius:14}} alt={s.name}/>:<div className="panel" style={{minHeight:300}}/>}
    <div><div className="accent" style={{fontWeight:800,letterSpacing:1}}>{network}</div><h1 style={{fontSize:46,lineHeight:1.05,margin:"8px 0 12px"}}>{s.name}</h1>
     <div className="muted" style={{display:"flex",flexWrap:"wrap",gap:8}}>{s.status&&<span>{s.status}</span>}{s.type&&<span>• {s.type}</span>}{s.premiered&&<span>• Premiered {s.premiered}</span>}{s.runtime&&<span>• {s.runtime} min</span>}</div>
     {s.genres?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:14}}>{s.genres.map((g:string)=><span key={g} className="panel" style={{padding:"6px 9px",fontSize:13}}>{g}</span>)}</div>}
     <div style={{marginTop:18,lineHeight:1.7}}>{s.summary?<p>{clean(s.summary)}</p>:<p className="muted">No description available.</p>}</div>
     {s.rating?.average&&<div className="muted" style={{marginTop:8}}>TVMaze rating: {s.rating.average}/10</div>}
     <TrackButton showId={s.id} title={s.name}/>
    </div>
   </div>
  </section>
  {upcoming.length>0&&<section style={{marginTop:28}}><h2>Upcoming episodes</h2><div style={{display:"grid",gap:10}}>{upcoming.map((e:any)=><article className="panel" style={{padding:16}} key={e.id}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><strong>S{e.season} E{e.number} — {e.name}</strong><span className="accent">{e.airdate}</span></div><div className="muted" style={{marginTop:5}}>{e.airtime||"Time TBA"}{e.runtime&&" • "+e.runtime+" min"}</div>{e.summary&&<p className="muted" style={{margin:"10px 0 0",lineHeight:1.5}}>{clean(e.summary)}</p>}</article>)}</div></section>}
  {cast.length>0&&<section style={{marginTop:28}}><h2>Cast</h2><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>{cast.map((c:any)=><div className="panel" style={{padding:14,display:"flex",gap:12,alignItems:"center"}} key={c.person.id}>{c.person.image?.medium&&<img src={c.person.image.medium} width="55" height="70" style={{objectFit:"cover",borderRadius:8}} alt=""/>}<div><strong>{c.person.name}</strong><div className="muted" style={{fontSize:13}}>{c.character?.name}</div></div></div>)}</div></section>}
  {recent.length>0&&<section style={{marginTop:28}}><h2>Recent episodes</h2><div style={{display:"grid",gap:10}}>{recent.map((e:any)=><div className="panel" style={{padding:14}} key={e.id}><strong>S{e.season} E{e.number} — {e.name}</strong><div className="muted">{e.airdate||"Date TBA"}</div></div>)}</div></section>}
 </main>
}