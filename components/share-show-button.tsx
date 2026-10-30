"use client";

import { useState } from "react";

type SharePrompt = "recommend" | "ask";

export default function ShareShowButton({ showId, title, compact = false }: { showId: number; title: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  async function share(prompt: SharePrompt) {
    const url = "https://www.mytvtracker.app/show/" + showId;
    const text = prompt === "recommend"
      ? "Hey, check out " + title + "! " + url
      : "Have you seen " + title + "? Is it any good? " + url;
    setOpen(false);
    setMessage("");
    try {
      if (navigator.share) {
        // Keep the URL in the message only, avoiding duplicate links in share sheets.
        await navigator.share({ text });
        setMessage("Shared!");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMessage("Message copied!");
      } else {
        setMessage("Copy this message: " + text);
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") setMessage("Could not share. Please try again.");
    }
  }
  return (
    <div style={{position:"relative",display:"inline-flex",flexDirection:"column",alignItems:"flex-start",gap:6,maxWidth:"100%"}}>
      <button type="button" className={compact ? "nav-pill" : "nav-pill show-action-link"} onClick={() => {setOpen(v=>!v);setMessage("");}} aria-expanded={open} aria-label={"Share "+title} style={{cursor:"pointer",minHeight:40}}>
        ↗ Share
      </button>
      {open && (
        <div className="panel" style={{position:"absolute",zIndex:20,top:"100%",left:0,marginTop:6,width:"min(290px,80vw)",padding:12,display:"grid",gap:8,boxShadow:"0 12px 28px rgba(0,0,0,.28)"}}>
          <strong style={{fontSize:13}}>Share {title}</strong>
          <button type="button" className="nav-pill" style={{textAlign:"left",cursor:"pointer"}} onClick={()=>share("recommend")}>Check this out!</button>
          <button type="button" className="nav-pill" style={{textAlign:"left",cursor:"pointer"}} onClick={()=>share("ask")}>Have you seen this?</button>
          <button type="button" className="muted" style={{border:0,background:"transparent",cursor:"pointer",textAlign:"left"}} onClick={()=>setOpen(false)}>Cancel</button>
        </div>
      )}
      {message && <span className="muted" role="status" style={{fontSize:12,maxWidth:220,overflowWrap:"anywhere"}}>{message}</span>}
    </div>
  );
}
