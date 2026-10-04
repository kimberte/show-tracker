"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import SiteNav from "@/components/site-nav";

const VAPID_PUBLIC_KEY_ENDPOINT = "/api/notifications/push-config";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export default function NotificationSettings() {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailTime, setEmailTime] = useState("08:00");
  const [pushTime, setPushTime] = useState("08:00");
  const [daysAhead, setDaysAhead] = useState(7);
  const [dailyPush, setDailyPush] = useState(true);
  const [episodeAlerts, setEpisodeAlerts] = useState(false);
  const [episodeAlertMinutes, setEpisodeAlertMinutes] = useState(0);
  const [timezone, setTimezone] = useState("UTC");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email || "");
      setEmailVerified(!!user.email_confirmed_at);
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setTimezone(detectedTimezone);
      setPushSupported(typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);

      const [{ data: profile }, { data: prefs }, { data: subscription }] = await Promise.all([
        supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
        supabase.from("notification_preferences").select("email_daily,days_ahead,email_time_local,push_time_local,daily_push,episode_alerts,episode_alert_minutes").eq("user_id", user.id).maybeSingle(),
        supabase.from("push_subscriptions").select("endpoint").eq("user_id", user.id).limit(1).maybeSingle(),
      ]);

      if (profile?.timezone) setTimezone(profile.timezone);
      if (prefs) {
        setEmailEnabled(!!prefs.email_daily);
        setDaysAhead(prefs.days_ahead || 7);
        setEmailTime(String(prefs.email_time_local || "08:00:00").slice(0, 5));
        setPushTime(String(prefs.push_time_local || "08:00:00").slice(0, 5));
        setDailyPush(prefs.daily_push !== false);
        setEpisodeAlerts(!!prefs.episode_alerts);
        setEpisodeAlertMinutes(Number(prefs.episode_alert_minutes || 0));
      }
      // The browser subscription is the authoritative local signal that push is enabled.
      // The database read can be briefly unavailable because of auth/RLS timing, which
      // should not leave the notification controls disabled after the user grants permission.
      let browserPushEnabled = false;
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          browserPushEnabled = !!(await registration.pushManager.getSubscription());
        } catch {
          browserPushEnabled = false;
        }
      }
      setPushEnabled(!!subscription?.endpoint || browserPushEnabled);
      setLoading(false);
    }
    load();
  }, []);

  async function enableBrowserNotifications() {
    if (!pushSupported) { setMessage("Browser notifications are not supported on this device/browser."); return; }
    setEnablingPush(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Browser notification permission was not granted.");
        setEnablingPush(false);
        return;
      }

      const config = await fetch(VAPID_PUBLIC_KEY_ENDPOINT).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Push notifications are not configured.");
        return data;
      });
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        });
      }

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save notification subscription.");

      setPushEnabled(true);
      setDailyPush(true);
      setMessage("Browser notifications enabled on this device.");
    } catch (error: any) {
      setMessage(error?.message || "Could not enable browser notifications.");
    }
    setEnablingPush(false);
  }

  async function save() {
    setSaving(true); setMessage("");
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Sign in to manage notifications."); setSaving(false); return; }
    if (emailEnabled && (!user.email || !user.email_confirmed_at)) {
      setMessage("Verify your account email before enabling daily emails.");
      setSaving(false);
      return;
    }

    const profile = await supabase.from("profiles").upsert(
      { id: user.id, email: user.email, timezone },
      { onConflict: "id" }
    );
    if (profile.error) { setMessage(profile.error.message); setSaving(false); return; }

    const result = await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      email_daily: emailEnabled,
      days_ahead: daysAhead,
      email_time_local: emailTime + ":00",
      push_time_local: pushTime + ":00",
      daily_push: dailyPush,
      episode_alerts: episodeAlerts,
      episode_alert_minutes: episodeAlertMinutes,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    setMessage(result.error ? result.error.message : "Notification settings saved.");
    setSaving(false);
  }

  async function sendTestEmail() {
    setTestingEmail(true); setMessage("");
    try {
      const response = await fetch("/api/notifications/test", { method: "POST" });
      const data = await response.json();
      setMessage(response.ok ? "Test email sent. Check your inbox (and spam/junk)." : (data.error || "Could not send test email."));
    } catch { setMessage("Could not send test email."); }
    setTestingEmail(false);
  }

  async function sendTestPush() {
    setTestingPush(true); setMessage("");
    try {
      const response = await fetch("/api/notifications/push-test", { method: "POST" });
      const data = await response.json();
      setMessage(response.ok ? "Test notification sent to this device." : (data.error || "Could not send test notification."));
    } catch { setMessage("Could not send test notification."); }
    setTestingPush(false);
  }

  if (loading) return <main className="shell"><p className="muted">Loading notification settings…</p></main>;

  return (
    <main className="shell" style={{ maxWidth: 760 }}>
      <SiteNav />
      <header className="page-header"><div>
        <Link href="/" className="muted">← Show Tracker</Link>
        <div className="accent eyebrow">NOTIFICATIONS</div>
        <h1 className="page-title">Stay on top of your TV</h1>
        <p className="muted page-subtitle">Choose how much My TV Tracker should remind you — daily schedule, episode alerts, or both.</p>
      </div></header>

      <section className="panel" style={{ padding: 24 }}>
        <div style={{ display: "grid", gap: 24 }}>
          <div>
            <div className="accent eyebrow">BROWSER NOTIFICATIONS</div>
            <h2 style={{ margin: "4px 0 6px" }}>What’s on, right when you need it</h2>
            <p className="muted" style={{ marginTop: 0 }}>{pushEnabled ? "Notifications are enabled on this device. You can turn them off any time in your browser settings." : "Notifications are currently disabled on this device. Enable them below to receive TV reminders."}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button onClick={enableBrowserNotifications} disabled={enablingPush || !pushSupported} style={{ padding: "12px 18px", border: 0, borderRadius: 10, background: "var(--accent)", color: "#111", fontWeight: 800 }}>
                {enablingPush ? "Enabling…" : pushEnabled ? "✓ Notifications enabled" : "Enable browser notifications"}
              </button>
              <button onClick={sendTestPush} disabled={testingPush || !pushEnabled} style={{ padding: "12px 18px", border: "1px solid var(--line)", borderRadius: 10, background: "transparent", color: pushEnabled ? "var(--text)" : "var(--muted)", fontWeight: 800 }}>{testingPush ? "Sending…" : "Test notification"}</button>
            </div>
            {!pushSupported && <p className="muted" style={{ fontSize: 13 }}>This browser does not support web push notifications.</p>}
          </div>

          <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <input type="checkbox" checked={dailyPush} onChange={(e) => setDailyPush(e.target.checked)} disabled={false} style={{ marginTop: 4 }} />
            <span><strong>Daily TV notification</strong><span className="muted" style={{ display: "block", marginTop: 4 }}>A simple daily list of what’s airing from your tracked shows, plus what’s coming next.</span></span>
          </label>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <input type="checkbox" checked={episodeAlerts} onChange={(e) => setEpisodeAlerts(e.target.checked)} style={{ marginTop: 4 }} />
              <span><strong>Episode alerts</strong><span className="muted" style={{ display: "block", marginTop: 4 }}>Get an alert when a tracked episode is about to air, when a reliable airtime is available.</span></span>
            </label>
            {episodeAlerts && <label style={{ display: "grid", gap: 7, marginTop: 14 }}>
              <span><strong>Alert me</strong></span>
              <select value={episodeAlertMinutes} onChange={(e) => setEpisodeAlertMinutes(Number(e.target.value))} style={{ padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "#090a0d", color: "var(--text)" }}>
                <option value={0}>At airing time</option><option value={5}>5 minutes before</option><option value={15}>15 minutes before</option><option value={30}>30 minutes before</option><option value={60}>1 hour before</option>
              </select>
            </label>}
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
            <div className="accent eyebrow">DAILY PUSH</div>
            <label style={{ display: "grid", gap: 7, maxWidth: 260, marginTop: 8, marginBottom: 20 }}>
              <strong>Send daily notification at</strong>
              <input type="time" value={pushTime} onChange={(e) => setPushTime(e.target.value)} disabled={!dailyPush} style={{ padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "#090a0d", color: "var(--text)" }} />
            </label>
            <div className="accent eyebrow">DAILY EMAIL</div>
            <div style={{ marginBottom: 14 }}>
              <strong>{email || "Account email"}</strong>
              <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: emailVerified ? "#22c55e" : "var(--accent)", marginTop: 4 }}>{emailVerified ? "✓ VERIFIED" : "VERIFY REQUIRED"}</span>
            </div>
            <label style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} disabled={!emailVerified} style={{ marginTop: 4 }} />
              <span><strong>Send me the daily email</strong><span className="muted" style={{ display: "block", marginTop: 4 }}>Your tracked shows for today and the next {daysAhead} days.</span></span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label style={{ display: "grid", gap: 7 }}>
                <strong>Send at</strong>
                <input type="time" value={emailTime} onChange={(e) => setEmailTime(e.target.value)} disabled={!emailEnabled} style={{ padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "#090a0d", color: "var(--text)" }} />
              </label>
              <label style={{ display: "grid", gap: 7 }}>
                <strong>Upcoming window</strong>
                <select value={daysAhead} onChange={(e) => setDaysAhead(Number(e.target.value))} disabled={!emailEnabled} style={{ padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "#090a0d", color: "var(--text)" }}>
                  <option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <strong>Timezone</strong>
            <p className="muted" style={{ margin: "5px 0 0" }}>{timezone}</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>We use your browser timezone for schedule dates and your selected email time.</p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={save} disabled={saving || testingEmail || testingPush} style={{ width: "fit-content", padding: "12px 18px", border: 0, borderRadius: 10, background: "var(--accent)", color: "#111", fontWeight: 800 }}>{saving ? "Saving…" : "Save notification settings"}</button>
            <button onClick={sendTestEmail} disabled={saving || testingEmail || !emailVerified} style={{ width: "fit-content", padding: "12px 18px", border: "1px solid var(--line)", borderRadius: 10, background: "transparent", color: "var(--text)", fontWeight: 800 }}>{testingEmail ? "Sending…" : "Test email"}</button>
          </div>
          {message && <p className="muted" style={{ margin: 0 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
}
