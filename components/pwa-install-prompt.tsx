"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {getSupabase} from "@/lib/supabase";
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
function installed(){return window.matchMedia("(display-mode: standalone)").matches||(navigator as Navigator & {standalone?:boolean}).standalone===true;}
function platform(){const ua=navigator.userAgent;return /iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?"ios":/Android/i.test(ua)?"android":"other";}
export default function PwaInstallPrompt(){
 const [visible,setVisible]=useState(false),[os,setOs]=useState("other"),[installEvent,setInstallEvent]=useState<InstallEvent|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const current=platform();setOs(current);
  if(current==="other"||installed())return;
  let active=true;
  const showForUser=async()=>{
   try{
    const {data:{user}}=await getSupabase().auth.getUser();
    if(!active||!user||installed())return;
    const key="mytvtracker-install-prompt-v1-"+user.id;
    if(localStorage.getItem(key))return;
    // Don't interrupt the sign-in screen. Offer once after a signed-in page loads.
    if(window.location.pathname.startsWith("/auth/")||window.location.pathname==="/login")return;
    setVisible(true);
   }catch{}
  };
  const onBefore=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);};
  const onInstalled=()=>{setVisible(false);setInstallEvent(null);};
  window.addEventListener("beforeinstallprompt",onBefore);
  window.addEventListener("appinstalled",onInstalled);
  const {data:{subscription}}=getSupabase().auth.onAuthStateChange((event)=>{if(event==="SIGNED_IN")void showForUser();if(event==="SIGNED_OUT")setVisible(false);});
  void showForUser();
  return()=>{active=false;subscription.unsubscribe();window.removeEventListener("beforeinstallprompt",onBefore);window.removeEventListener("appinstalled",onInstalled);};
 },[]);
 async function close(){
  try{const {data:{user}}=await getSupabase().auth.getUser();if(user)localStorage.setItem("mytvtracker-install-prompt-v1-"+user.id,"seen");}catch{}
  setVisible(false);
 }
 async function install(){
  if(os==="android"&&installEvent){
   setBusy(true);
   try{await installEvent.prompt();await installEvent.userChoice;}catch{}
   finally{setBusy(false);void close();}
  }else void close();
 }
 if(!visible)return null;
 return <div className="pwa-install-backdrop" role="presentation"><section className="pwa-install-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
  <button type="button" className="pwa-install-close" aria-label="Dismiss installation suggestion" onClick={()=>void close()}>×</button>
  <div className="accent eyebrow">MY TV TRACKER APP</div>
  <h2 id="pwa-install-title">Add My TV Tracker to your home screen</h2>
  <p className="muted">Open your shows in one tap.</p>
  {os==="ios"?<p>{/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)?"Open this page in Safari, then tap Share and Add to Home Screen.":"In Safari, tap Share, then Add to Home Screen."}</p>:<p>{installEvent?"Install the app right from your browser.":"In Chrome, open the menu (⋮) and choose Install app or Add to Home screen."}</p>}
  <div className="pwa-install-actions">
   {os==="android"&&installEvent?<button type="button" className="primary-button" disabled={busy} onClick={()=>void install()}>{busy?"Opening…":"Install app"}</button>:<Link href="/install" className="primary-button" onClick={()=>void close()}>Installation steps</Link>}
   <button type="button" className="nav-pill" onClick={()=>void close()}>Not now</button>
  </div>
  <Link href="/install" className="muted" onClick={()=>void close()} style={{fontSize:12}}>Find these instructions anytime</Link>
 </section></div>;
}
