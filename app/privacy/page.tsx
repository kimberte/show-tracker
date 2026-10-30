import SiteNav from "@/components/site-nav";

export default function PrivacyPage() {
  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header"><div><div className="accent eyebrow">PRIVACY</div><h1 className="page-title">Privacy Policy</h1><p className="muted page-subtitle">A straightforward summary of how My TV Tracker handles information.</p></div></header>
      <section className="panel utility-card">
        <h2>What we store</h2>
        <p className="muted">If you create an account, we store the information needed to authenticate you and maintain your tracked shows and notification preferences. We do not need your TV viewing history beyond the shows you choose to track.</p>
        <h2>Notifications</h2>
        <p className="muted">If you enable browser notifications, your device’s push subscription is stored so we can deliver notifications. If you enable daily email, your account email is used to send that schedule.</p>
        <h2>Analytics</h2>
        <p className="muted">The site uses Google Analytics to understand site usage and improve the service, and may display advertising through Google AdSense. These services may use cookies or similar technologies according to their own privacy policies.</p>
        <h2>Contact enquiries</h2><p className="muted">When you send a message through our contact form, we collect your name, email address, enquiry category and message to respond to your request. Messages are delivered using our email provider and may be retained as necessary to handle support, prevent abuse and meet legal obligations.</p><h2>Your choices</h2><p className="muted">You can manage email and browser notification preferences in your account settings. You can also request access to or deletion of personal information through our contact form, subject to applicable legal requirements.</p><h2>Third-party services</h2>
        <p className="muted">Authentication and account data are handled through Supabase. TV show and episode data comes from TVMaze. Email delivery uses Resend.</p>
        <p className="muted">This page is a plain-language summary, not legal advice. For privacy questions, account information requests or deletion requests, please use our <a href="/contact">contact form</a>.</p>
      </section>
    </main>
  );
}
