import SiteNav from "@/components/site-nav";

export default function TermsPage() {
  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header"><div><div className="accent eyebrow">TERMS</div><h1 className="page-title">Terms of use</h1><p className="muted page-subtitle">Simple terms for using My TV Tracker.</p></div></header>
      <section className="panel utility-card">
        <h2>The service</h2>
        <p className="muted">My TV Tracker provides TV show, episode, schedule, discovery, and reminder tools. The service is provided as-is and schedules may change without notice.</p>
        <h2>Account responsibility</h2>
        <p className="muted">Keep your account credentials and email access secure. Do not use the service to abuse, disrupt, or attempt to gain unauthorized access to the service or another user’s information.</p>
        <h2>TV information</h2>
        <p className="muted">Show and episode information is supplied by third-party data sources and may contain omissions or errors. My TV Tracker does not guarantee that a listed episode will air exactly as shown.</p>
        <h2>Changes</h2>
        <p className="muted">Features and these terms may change as the service evolves. Continued use after changes means you accept the updated terms.</p>
        <p className="muted">This page is a plain-language summary, not legal advice.</p>
      </section>
    </main>
  );
}
