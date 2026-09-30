"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function NotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [daysAhead, setDaysAhead] = useState(7);
  const [timezone, setTimezone] = useState("UTC");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email || "");
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setTimezone(detectedTimezone);

      const [{ data: profile }, { data: prefs }] = await Promise.all([
        supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
        supabase.from("notification_preferences").select("email_daily,days_ahead").eq("user_id", user.id).maybeSingle(),
      ]);

      if (profile?.timezone) setTimezone(profile.timezone);
      if (prefs) {
        setEnabled(!!prefs.email_daily);
        setDaysAhead(prefs.days_ahead || 7);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    setMessage("");
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Sign in to manage notifications."); setSaving(false); return; }

    const profile = await supabase.from("profiles").upsert(
      { id: user.id, email: user.email, timezone },
      { onConflict: "id" }
    );
    if (profile.error) { setMessage(profile.error.message); setSaving(false); return; }

    const result = await supabase.from("notification_preferences").upsert(
      { user_id: user.id, email_daily: enabled, days_ahead: daysAhead, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    setMessage(result.error ? result.error.message : "Notification settings saved.");
    setSaving(false);
  }

  if (loading) return <main className="shell"><p className="muted">Loading notification settings…</p></main>;

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <header className="page-header">
        <div>
          <Link href="/" className="muted">← Show Tracker</Link>
          <div className="accent eyebrow">NOTIFICATIONS</div>
          <h1 className="page-title">Daily email</h1>
          <p className="muted page-subtitle">Get a simple daily roundup of what’s on today and what’s coming next.</p>
        </div>
      </header>

      <section className="panel" style={{ padding: 24 }}>
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <strong>{email || "Your account email"}</strong>
            <p className="muted" style={{ margin: "5px 0 0" }}>We’ll send the roundup to your Show Tracker sign-in email.</p>
          </div>

          <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ marginTop: 4 }} />
            <span><strong>Send me a daily email</strong><span className="muted" style={{ display: "block", marginTop: 4 }}>Includes today’s episodes plus the next {daysAhead} days.</span></span>
          </label>

          <label style={{ display: "grid", gap: 7 }}>
            <strong>Upcoming window</strong>
            <select value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))} style={{ padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "#090a0d", color: "var(--text)" }}>
              <option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option>
            </select>
          </label>

          <div>
            <strong>Timezone</strong>
            <p className="muted" style={{ margin: "5px 0 0" }}>{timezone}</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>We use your browser timezone for schedule dates.</p>
          </div>

          <button onClick={save} disabled={saving} style={{ width: "fit-content", padding: "12px 18px", border: 0, borderRadius: 10, background: "var(--accent)", color: "#111", fontWeight: 800 }}>
            {saving ? "Saving…" : "Save notification settings"}
          </button>
          {message && <p className="muted" style={{ margin: 0 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}