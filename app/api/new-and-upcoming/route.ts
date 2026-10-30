import { NextResponse } from "next/server";

export const revalidate = 3600;

// Editorial priorities: premium scripted series with new episodes or upcoming premieres.
// Names are looked up against TVMaze rather than relying on hard-coded show IDs.
const spotlight = ["Nocturne", "Slow Horses", "The Diplomat", "MobLand", "Dark Matter", "From", "Tulsa King", "The Last of Us", "Severance", "The Pitt", "Fallout", "The White Lotus"];
const premium = /apple tv|hbo|max|prime video|amazon|paramount|showtime|netflix|fx|hulu|disney\+|amc|starz|peacock/i;
const excludedGenres = /game show|talk show|news|reality|sports|variety|documentary|lifestyle|food|travel|music/i;
const excludedTitles = /jeopardy|wheel of fortune|the price is right|family feud|today show|good morning america|late night|tonight show|the view|entertainment tonight|access hollywood|live with|judge judy|daily show|news|sportscenter|dateline/i;
const dramaGenres = /drama|comedy|thriller|crime|science-fiction|fantasy|mystery|horror|action|adventure|romance/i;
const isoDate = (d:Date)=>d.toISOString().slice(0,10);
const today = ()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const provider = (s:any)=>[s.webChannel?.name,s.network?.name].filter(Boolean).join(" ");
function eligible(s:any){
 const country=s.network?.country?.name||s.webChannel?.country?.name||"";
 const genres=(s.genres||[]).join(" ");
 return s.id&&s.image?.original&&s.language==="English"&&
 (country==="United States"||country==="Canada"||premium.test(provider(s)))&&
 !excludedGenres.test(genres)&&!excludedTitles.test(s.name||"")&&
 (dramaGenres.test(genres)||premium.test(provider(s)))&&
 s.type!=="Reality"&&s.type!=="Talk Show"&&s.type!=="Game Show";
}
export async function GET(){
 try{
  const now=today();
  const end=isoDate(new Date(Date.now()+1000*60*60*24*65));
  const response=await fetch("https://api.tvmaze.com/schedule/full",{next:{revalidate:3600},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error("TV schedule unavailable");
  const schedule=await response.json();
  const candidates=new Map<number,any>();
  for(const ep of schedule){
   const show=ep?.show||ep?._embedded?.show;
   if(!show||!ep?.airdate||ep.airdate<now||ep.airdate>end||!eligible(show))continue;
   if(show.status!=="Running"&&show.status!=="In Development")continue;
   const existing=candidates.get(show.id);
   if(!existing||ep.airdate<existing._nextAirdate){
    candidates.set(show.id,{...show,_nextAirdate:ep.airdate,_nextAirtime:ep.airtime||null,_nextEpisode:{name:ep.name,season:ep.season,number:ep.number},_isNew:ep.season===1&&ep.number===1});
   }
  }
  // Explicit editorial priorities are still required to have a scheduled upcoming episode.
  const curated=Array.from(candidates.values()).map(s=>{
   const days=Math.max(0,Math.round((Date.parse(s._nextAirdate+"T12:00:00Z")-Date.parse(now+"T12:00:00Z"))/86400000));
   const titleRank=spotlight.findIndex(n=>n.toLowerCase()===s.name.toLowerCase());
   const genres=(s.genres||[]).join(" ");
   const premiere= s._nextEpisode?.season===1&&s._nextEpisode?.number===1;
   const seasonStart=s._nextEpisode?.number===1;
   const score=(titleRank>=0?110-titleRank*3:0)+(premium.test(provider(s))?65:0)+(premiere?38:seasonStart?24:0)+(days===0?34:days<=7?24:days<=21?15:0)+(dramaGenres.test(genres)?15:0)+(s.rating?.average||0);
   return {...s,_spotlightScore:score};
  }).sort((a,b)=>b._spotlightScore-a._spotlightScore||a._nextAirdate.localeCompare(b._nextAirdate));
  return NextResponse.json(curated.slice(0,30),{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=7200"}});
 }catch{return NextResponse.json({error:"TV service unavailable"},{status:502});}
}
