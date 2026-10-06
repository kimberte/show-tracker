import SiteNav from "@/components/site-nav";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header"><div><div className="accent eyebrow">PRIVACY</div><h1 className="page-title">Privacy</h1><p className="muted page-subtitle">A straightforward summary of how My TV Tracker handles information.</p></div></header>
      <section className="panel utility-card">
        <h2>What we store</h2>
        <p className="muted">If you create an account, we store the information needed to authenticate you and maintain your tracked shows and notification preferences. We do not need your TV viewing history beyond the shows you choose to track.</p>
        <h2>Notifications</h2>
        <p className="muted">If you enable browser notifications, your device’s push subscription is stored so we can deliver notifications. If you enable daily email, your account email is used to send that schedule.</p>
        <h2>Analytics</h2>
        <p className="muted">The site may use Google Analytics to understand general site usage and improve the service.</p>
        <h2>Third-party services</h2>
        <p className="muted">Authentication and account data are handled through Supabase. TV show and episode data comes from TVMaze. Email delivery uses Resend.</p>
        <p className="muted">This page is a plain-language summary, not legal advice. For questions about your account or personal information, use the contact method provided by the site owner.</p>
      </section>
    </main>
  );
}
