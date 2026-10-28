"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {getSupabase} from "@/lib/supabase";
import {trackEvent} from "@/lib/analytics";
const SITE_URL=process.env.NEXT_PUBLIC_SITE_URL||"https://www.mytvtracker.app";
function destination(){if(typeof window==="undefined")return "/";const path=new URLSearchParams(window.location.search).get("next")||"/";return path.startsWith("/")&&!path.startsWith("//")?path:"/";}
export default function Login(){
 const[email,setEmail]=useState("");const[message,setMessage]=useState("");const[busy,setBusy]=useState(false);const router=useRouter();
 useEffect(()=>{getSupabase().auth.getUser().then(({data})=>{if(data.user)router.replace(destination())})},[router]);
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage("");const supabase=getSupabase();trackEvent("login_request");const next=destination();const callback=SITE_URL+"/auth/callback?next="+encodeURIComponent(next);const{error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:callback}});setMessage(error?error.message:"Check your inbox. Open the secure link to sign in — no password needed.");setBusy(false)}
 return <main className="shell" style={{maxWidth:620,paddingTop:35,paddingBottom:60}}>
 <Link href="/" className="muted">← Back to My TV Tracker</Link>
 <section className="panel" style={{padding:"clamp(22px,5vw,42px)",marginTop:26,border:"1px solid var(--line)"}}>
 <div className="accent eyebrow">YOUR PERSONAL TV COMPANION</div>
 <h1 style={{fontSize:"clamp(30px,5vw,43px)",marginBottom:10}}>Welcome to My TV Tracker</h1>
 <p className="muted" style={{fontSize:16,lineHeight:1.65}}>Create a free account or sign in with your email. Keep your shows, recommendations and alerts together across devices.</p>
 <div style={{display:"grid",gap:10,margin:"24px 0",padding:18,borderRadius:12,background:"rgba(128,128,128,.08)"}}>
 <span>✓ Save and manage shows you're watching</span><span>✓ Get daily episode reminders and notifications</span><span>✓ Keep dismissed recommendations hidden</span>
 </div>
 <form onSubmit={submit} style={{display:"grid",gap:12}}>
 <label htmlFor="email" style={{fontWeight:700}}>Email address</label>
 <input id="email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={{padding:15,borderRadius:10,border:"1px solid var(--line)",background:"var(--panel)",color:"inherit",fontSize:16}}/>
 <button disabled={busy} style={{padding:15,border:0,borderRadius:10,background:"var(--accent)",fontWeight:800,fontSize:16,opacity:busy?.7:1,cursor:busy?"wait":"pointer"}}>{busy?"Sending secure link…":"Continue with email"}</button>
 </form>
 {message&&<p role="status" style={{marginTop:16,lineHeight:1.5}}>{message}</p>}
 <p className="muted" style={{fontSize:13,marginTop:20}}>New here? Continuing with your email creates your account if you don't have one. No password required.</p>
 </section>
 </main>;
}