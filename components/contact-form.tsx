"use client";

import { useState } from "react";

const topics = [
  ["bug", "Report a bug"],
  ["feedback", "General feedback / suggestion"],
  ["support", "Account or notification help"],
  ["privacy", "Privacy or data request"],
  ["other", "Other enquiry"],
] as const;

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("bug");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true); setStatus(""); setSuccess(false);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({name,email,topic,message,website}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't send your message.");
      setSuccess(true);
      setStatus("Thanks! Your message has been sent.");
      setMessage("");
    } catch (error: any) {
      setStatus(error?.message || "We couldn't send your message. Please try again.");
    } finally { setSending(false); }
  }

  return <form onSubmit={submit} className="contact-form">
    <div className="contact-form-grid">
      <label>Full name<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" /></label>
      <label>Email address<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></label>
    </div>
    <label>What can we help with?
      <select required value={topic} onChange={e=>setTopic(e.target.value)}>
        {topics.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label>Your message
      <textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us a little more. For bug reports, include what happened and which page you were using." />
    </label>
    <div className="contact-form-trap" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)} /></label></div>
    <p className="muted" style={{fontSize:13,margin:0}}>We'll use your email only to respond to this enquiry. Please don't include passwords or other sensitive information.</p>
    <button className="primary-button" type="submit" disabled={sending}>{sending?"Sending…":"Send message"}</button>
    {status&&<p role="status" style={{margin:0,color:success?"inherit":"#e07a7a"}}>{status}</p>}
  </form>;
}
