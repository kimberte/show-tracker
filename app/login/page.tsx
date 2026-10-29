"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {getSupabase} from "@/lib/supabase";
import TvBotLoader from "@/components/tv-bot-loader";
const SITE_URL=process.env.NEXT_PUBLIC_SITE_URL||"https://www.mytvtracker.app";
type Mode="login"|"register"|"reset"|"migrate";
function destination(){if(typeof window==="undefined")return "/";const path=new URLSearchParams(window.location.search).get("next")||"/";return path.startsWith("/")&&!path.startsWith("//")?path:"/";}
export default function Login(){
 const [mode,setMode]=useState<Mode>("login");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [username,setUsername]=useState("");
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const router=useRouter();
 useEffect(()=>{getSupabase().auth.getUser().then(({data})=>{if(data.user)router.replace(destination())})},[router]);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  const supabase=getSupabase();
  const callback=SITE_URL+"/auth/callback?next="+encodeURIComponent(destination());
  try{
   if(mode==="login"){
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)throw error;
    router.replace(destination());router.refresh();
   }else if(mode==="register"){
    const name=username.trim();
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(name)){setMessage("Username must be 3–24 letters, numbers or underscores.");return;}
    if(password.length<8){setMessage("Use a password of at least 8 characters.");return;}
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:callback,data:{username:name}}});
    if(error)throw error;
    if(data.session){router.replace(destination());router.refresh();}
    else setMessage("Check your inbox to confirm your email, then sign in with your password.");
   }else if(mode==="reset"){
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:SITE_URL+"/auth/reset-password"});
    if(error)throw error;
    setMessage("If this email has an account, you'll receive a password reset link.");
   }else{
    const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{shouldCreateUser:false,emailRedirectTo:SITE_URL+"/auth/set-password"}});
    if(error)throw error;
    setMessage("Check your inbox for a secure link to set your password. Your existing shows and watch history will stay on the same account.");
   }
  }catch(err:any){setMessage(err?.message||"Something went wrong. Please try again.");}
  finally{setBusy(false);}
 }
 return <main className="shell" style={{maxWidth:600,paddingTop:35,paddingBottom:60}}>
  <Link href="/" className="muted">← Back to My TV Tracker</Link>
  <section className="panel" style={{padding:"clamp(22px,5vw,42px)",marginTop:26}}>
   <div className="accent eyebrow">YOUR PERSONAL TV COMPANION</div>
   <h1 style={{fontSize:"clamp(30px,5vw,43px)",marginBottom:8}}>{mode==="login"?"Welcome back":mode==="register"?"Create your account":mode==="migrate"?"Set up your password":"Reset your password"}</h1>
   <p className="muted">{mode==="migrate"?"Already used email sign-in? Keep your account and add a password.":"Your shows, watch history and alerts, all in one place."}</p>
   <form onSubmit={submit} style={{display:"grid",gap:12,marginTop:22}}>
    {mode==="register"&&<><label htmlFor="username">Username</label><input id="username" required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your username" style={field}/></>}
    <label htmlFor="email">Email address</label><input id="email" required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={field}/>
    {(mode==="login"||mode==="register")&&<><label htmlFor="password">Password</label><input id="password" required type="password" minLength={8} autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} style={field}/></>}
    <button disabled={busy} style={{padding:15,border:0,borderRadius:10,background:"var(--accent)",fontWeight:800,fontSize:16,opacity:busy?.7:1}}>{busy?"Working…":mode==="login"?"Sign in":mode==="register"?"Create account":mode==="reset"?"Send reset link":"Email me a setup link"}</button>
   </form>
   {busy&&<TvBotLoader label="Getting your account ready…"/>}
   {message&&<p role="status" style={{marginTop:16,lineHeight:1.5}}>{message}</p>}
   <div style={{display:"flex",flexWrap:"wrap",gap:14,marginTop:22}}>
    {mode!=="login"&&<button type="button" className="view-link" onClick={()=>{setMode("login");setMessage("")}}>Sign in</button>}
    {mode!=="register"&&<button type="button" className="view-link" onClick={()=>{setMode("register");setMessage("")}}>Create account</button>}
    {mode!=="reset"&&<button type="button" className="view-link" onClick={()=>{setMode("reset");setMessage("")}}>Forgot password?</button>}
    {mode!=="migrate"&&<button type="button" className="view-link" onClick={()=>{setMode("migrate");setMessage("")}}>Existing email-link user?</button>}
   </div>
   <p className="muted" style={{fontSize:12,marginTop:22}}>Sign in with your email and password. Usernames identify your profile.</p>
  </section>
 </main>;
}
const field:React.CSSProperties={padding:15,borderRadius:10,border:"1px solid var(--line)",background:"var(--panel)",color:"inherit",fontSize:16,width:"100%",boxSizing:"border-box"};
