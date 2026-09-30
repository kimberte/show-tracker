"use client";
import{useEffect,useState}from"react";import Link from"next/link";import{getSupabase}from"@/lib/supabase";

export default function TrackButton({showId,title,compact=false}:{showId:number;title:string;compact?:boolean}){
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");const[tracked,setTracked]=useState(false);const[checked,setChecked]=useState(false);

 useEffect(()=>{let active=true;async function check(){const supabase=getSupabase();const{data:{user}}=await supabase.auth.getUser();if(!user){if(active)setChecked(true);return}
  const{data:show}=await supabase.from("shows").select("id").eq("tvmaze_id",showId).maybeSingle();
  if(show){const{data:link}=await supabase.from("tracked_shows").select("id").eq("user_id",user.id).eq("show_id",show.id).maybeSingle();if(active)setTracked(!!link)}
  if(active)setChecked(true);
 }check();return()=>{active=false}},[showId]);

 async function track(){setBusy(true);setMessage("");const supabase=getSupabase();const{data:{user}}=await supabase.auth.getUser();if(!user){setMessage("Sign in to sync your shows.");setBusy(false);return}
  const{error}=await supabase.from("shows").upsert({tvmaze_id:showId,title},{onConflict:"tvmaze_id"});if(error){setMessage(error.message);setBusy(false);return}
  const{data:show}=await supabase.from("shows").select("id").eq("tvmaze_id",showId).single();
  if(!show){setMessage("Could not save show.");setBusy(false);return}
  const result=await supabase.from("tracked_shows").upsert({user_id:user.id,show_id:show.id},{onConflict:"user_id,show_id"});
  if(result.error){setMessage(result.error.message);setBusy(false);return}
  setTracked(true);setMessage("");setBusy(false);
 }

 if(tracked)return <div><button disabled style={{marginTop:compact?0:20,padding:compact?"9px 13px":"12px 18px",border:"1px solid var(--line)",borderRadius:10,background:"var(--panel)",color:"var(--muted)",fontWeight:800,cursor:"default"}}>✓ Tracked</button></div>;

 return <div><button onClick={track} disabled={busy||!checked} style={{marginTop:compact?0:20,padding:compact?"9px 13px":"12px 18px",border:0,borderRadius:10,background:"var(--accent)",fontWeight:800,opacity:(busy||!checked)?0.7:1}}>{busy?"Saving…":"+ Track this show"}</button>{message==="Sign in to sync your shows."?<div className="muted" style={{marginTop:8}}>{message} <Link href="/login" className="accent">Sign in</Link></div>:message&&<div className="muted" style={{marginTop:8}}>{message}</div>}</div>
}