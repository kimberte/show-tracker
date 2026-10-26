import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const metadata: Metadata = { title:"TV Guides Lab — Review", description:"Review expanded TV tracking and schedule advice before publication.", robots:{index:false,follow:false} };

const guides = [
 {id:"build-watchlist",label:"GETTING STARTED",title:"Build a TV watchlist you'll actually use",intro:"A useful watchlist is not a catalogue of everything you've ever watched. It's a short, dependable list of the series you want to keep up with.",steps:[
 ["Start with active shows","Add the shows you are currently watching or genuinely intend to return to. A shorter list makes daily notifications and upcoming episodes easier to scan."],
 ["Check the next airdate","A show can be renewed without having a confirmed episode date. Treat unknown dates as unannounced, not cancelled."],
 ["Record what you've watched","Mark episodes as watched when you finish them, particularly for long-running shows. This keeps outstanding counts useful."],
 ["Review your list regularly","Untrack shows you no longer follow. You can always add them back later."]],cta:"Open My Shows",href:"/my-shows"},
 {id:"weekly-routine",label:"PLANNING",title:"Plan a week of television without missing premieres",intro:"Your personalized schedule and a public TV guide solve different problems. Use both to stay current and discover something new.",steps:[
 ["Look ahead seven days","Scan the next week of scheduled episodes. Note premieres, returning series and any episodes that don't yet have an airtime."],
 ["Separate broadcast from streaming","A broadcaster's listed airtime may be local to its market. Streaming services can release episodes at different hours or drop multiple episodes together."],
 ["Keep discovery separate","Browse public schedules for ideas, then add only the series you want to follow to your own watchlist."],
 ["Use a daily reminder","A concise daily email can highlight today's tracked shows and what's coming next without overwhelming you."]],cta:"Open Upcoming",href:"/upcoming"},
 {id:"missing-airdates",label:"TROUBLESHOOTING",title:"Why an episode is missing from your TV schedule",intro:"Missing episodes usually mean scheduling information is incomplete or has changed, rather than that the show has disappeared.",steps:[
 ["Confirm the show's status","A running show can still be between seasons or on hiatus. Renewal announcements often arrive well before episode dates."],
 ["Check the region","Networks and streaming platforms can release the same show on different dates in different countries."],
 ["Check the source schedule","Public episode data can lag a broadcaster announcement or change after a postponement. Revisit the show's detail page later."],
 ["Check your tracked list","Personalized schedules show only series you've tracked. If the show isn't tracked, it won't appear in your personal Today or Upcoming sections."]],cta:"Explore TV Discovery",href:"/lab/tv-discovery"}
];
export default function TvGuidesLab() {
 return <main className="shell"><SiteNav/>
  <header className="page-header"><div><div className="accent eyebrow">REVIEW ONLY · EDITORIAL LIBRARY</div><h1 className="page-title">Watch smarter: TV tracking guides</h1><p className="muted page-subtitle">Practical advice for organizing your shows, understanding air dates and making the most of a personal TV schedule.</p></div></header>
  <nav aria-label="Guides on this page" className="panel" style={{padding:22,margin:"24px 0"}}><strong>Jump to a guide</strong><div style={{display:"flex",flexWrap:"wrap",gap:16,marginTop:12}}>{guides.map(g=><a className="accent" key={g.id} href={"#"+g.id}>{g.title} →</a>)}</div></nav>
  {guides.map(g=><article id={g.id} className="panel" key={g.id} style={{padding:"clamp(22px,4vw,40px)",marginBottom:24,scrollMarginTop:30}}><div className="accent eyebrow">{g.label}</div><h2 style={{fontSize:"clamp(1.4rem,3vw,2rem)",margin:"10px 0 16px"}}>{g.title}</h2><p style={{lineHeight:1.7,maxWidth:760}}>{g.intro}</p><div style={{display:"grid",gap:16,margin:"24px 0"}}>{g.steps.map(([title,body],i)=><section key={title} style={{borderTop:"1px solid rgba(150,150,150,.2)",paddingTop:14}}><h3 style={{margin:"0 0 7px"}}>{i+1}. {title}</h3><p className="muted" style={{margin:0,lineHeight:1.7}}>{body}</p></section>)}</div><Link className="accent" href={g.href}>{g.cta} →</Link></article>)}
  <section className="panel" style={{padding:24}}><h2>How these guides fit into My TV Tracker</h2><p className="muted">My TV Tracker combines public TV discovery with a personalized watchlist. Public schedules help you find what's airing; tracking lets you follow selected shows, mark episodes watched and receive reminders. These guides are original explanatory content, not episode listings or automatic summaries.</p><Link href="/lab/tv-discovery" className="accent">Review the TV discovery lab →</Link></section>
  <p className="muted" style={{marginTop:20}}>This is an unindexed editorial review page. The existing /guides page is unchanged until approval.</p>
 </main>;
}
