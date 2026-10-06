import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <span className="accent">MY TV</span> TRACKER
      </div>
      <div className="site-footer-links">
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>
      <div className="site-footer-note">A simple TV tracker for people who love their shows.</div>
    </footer>
  );
}
