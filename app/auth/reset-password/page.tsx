"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {getSupabase} from "@/lib/supabase";
import TvBotLoader from "@/components/tv-bot-loader";
export default function SetPassword(){
 const [ready,setReady]=useState(false),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const router=useRouter();
 useEffect(()=>{const supabase=getSupabase();supabase.auth.getUser().then(({data})=>setReady(!!data.user));const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setReady(!!session?.user));return()=>subscription.unsubscribe()},[]);
 async function save(e:React.FormEvent){e.preventDefault();if(password.length<8){setMessage("Use at least 8 characters.");return}if(password!==confirm){setMessage("Passwords do not match.");return}setBusy(true);setMessage("");try{const {error}=await getSupabase().auth.updateUser({password});if(error)throw error;router.replace("/profile");router.refresh()}catch(e:any){setMessage(e?.message||"Could not save password.")}finally{setBusy(false)}}
 return <main className="shell" style={{maxWidth:540,paddingTop:60,paddingBottom:80}}><section className="panel" style={{padding:28}}><div className="accent eyebrow">ACCOUNT SECURITY</div><h1>Set your password</h1><p className="muted">Keep your existing shows, watch history and notifications.</p>{!ready?<p>Open your account email link first, or <Link href="/login">return to sign in</Link>.</p>:<form onSubmit={save} style={{display:"grid",gap:12}}><label htmlFor="new-password">New password</label><input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} style={field}/><label htmlFor="confirm-password">Confirm password</label><input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={field}/><button disabled={busy} className="primary-button" type="submit">{busy?"Saving…":"Save password"}</button></form>}{busy&&<TvBotLoader label="Securing your account…"/>}{message&&<p role="status">{message}</p>}</section></main>
}
const field:React.CSSProperties={padding:14,borderRadius:10,border:"1px solid var(--line)",background:"var(--panel)",color:"inherit",fontSize:16};
