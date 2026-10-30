import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const expertTitles=["MobLand","Crystal Lake","Dark Matter","From","The Diplomat","Slow Horses","VisionQuest","The Lowdown","Abbott Elementary","Tulsa King"];
const premium=/apple tv|hbo|max|prime video|amazon|paramount|showtime|netflix|fx|hulu|disney|amc|starz/i;
const scripted=/drama|comedy|thriller|crime|science-fiction|fantasy|mystery|horror|action/i;
const excluded=/game show|talk show|news|reality|sports|variety|documentary|lifestyle/i;
type Show={id:number;name:string;genres?:string[];language?:string;image?:{medium?:string;original?:string};webChannel?:{name?:string};network?:{name?:string};rating?:{average?:number};status?:string};
function qualify(s:Show){const genres=(s.genres||[]).join(" ");return s.id&&s.language==="English"&&s.image?.medium&&scripted.test(genres)&&!excluded.test(genres)&&s.status==="Running";}
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!pushConfigured()||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Push unavailable"},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:prefs,error}=await db.from("notification_preferences").select("user_id,weekly_recommendations,weekly_expert_picks").or("weekly_recommendations.eq.true,weekly_expert_picks.eq.true");
 if(error)return NextResponse.json({error:error.message},{status:500});
 const date=new Date().toISOString().slice(0,10);
 const week=date.slice(0,10);
 let sent=0,skipped=0;
 // Fetch a shared pool once; the personal ranking is per-user and excludes their tracked shows.
 let pool:Show[]=[];
 try{const r=await fetch("https://api.tvmaze.com/schedule/full",{next:{revalidate:3600},signal:AbortSignal.timeout(12000)});if(r.ok){const episodes=await r.json();const seen=new Set<number>();for(const ep of episodes){const s=ep?.show||ep?._embedded?.show;if(s&&qualify(s)&&!seen.has(s.id)){seen.add(s.id);pool.push(s);}}}}catch{}
 const experts=expertTitles.filter(n=>pool.some(s=>s.name.toLowerCase()===n.toLowerCase()));
 for(const pref of prefs||[]){
  const {data:subs}=await db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id",pref.user_id);
  if(!subs?.length){skipped++;continue;}
  const {data:tracked}=await db.from("tracked_shows").select("show:shows(tvmaze_id)").eq("user_id",pref.user_id);
  const ids=new Set((tracked||[]).map((r:any)=>Number(r.show?.tvmaze_id)).filter(Boolean));
  const {data:dismissals}=await db.from("recommendation_dismissals").select("tvmaze_show_id").eq("user_id",pref.user_id);
  const dismissed=new Set((dismissals||[]).map(r=>Number(r.tvmaze_show_id)));
  const {data:delivered}=await db.from("notification_deliveries").select("delivery_key").eq("user_id",pref.user_id).like("delivery_key","weekly:%:"+week);
  const done=new Set((delivered||[]).map(r=>r.delivery_key));
  let genres=new Set<string>();
  if(pref.weekly_recommendations&&ids.size){
   const selected=pool.filter(s=>ids.has(s.id));
   for(const s of selected)for(const g of s.genres||[])genres.add(g);
  }
  const recommendations=pool.filter(s=>!ids.has(s.id)&&!dismissed.has(s.id)&&!expertTitles.some(n=>n.toLowerCase()===s.name.toLowerCase())).map(s=>({s,score:(s.genres||[]).filter(g=>genres.has(g)).length*30+(premium.test([s.network?.name,s.webChannel?.name].join(" "))?15:0)+(s.rating?.average||0)})).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.s.name);
  const messages:Array<{kind:string;title:string;body:string;url:string}>=[];
  if(pref.weekly_recommendations&&ids.size&&recommendations.length)messages.push({kind:"personal",title:"Shows we recommend for you",body:recommendations.join(" · ")+" — See all your recommendations and dismiss any you’re not interested in.",url:"/discover"});
  if(pref.weekly_expert_picks&&experts.length)messages.push({kind:"experts",title:"What our experts are watching",body:experts.slice(0,3).join(" · "),url:"/"});
  for(const m of messages){
   const key="weekly:"+m.kind+":"+pref.user_id+":"+week;
   if(done.has(key))continue;
   let deliveredCount=0;
   for(const sub of subs){try{await sendWebPush(sub,{title:m.title,body:m.body,url:m.url,tag:"weekly-"+m.kind+"-"+week});deliveredCount++}catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await db.from("push_subscriptions").delete().eq("endpoint",sub.endpoint)}}
   if(deliveredCount){await db.from("notification_deliveries").insert({user_id:pref.user_id,delivery_key:key,kind:"daily",episode_id:null});sent++;}
  }
 }
 return NextResponse.json({sent,skipped});
}
