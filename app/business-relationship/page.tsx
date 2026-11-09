import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Website Ownership & Operator",
  description: "Public business relationship and website operator information for My TV Tracker.",
  
  alternates: { canonical: "/business-relationship" },
};

export default function BusinessRelationshipPage() {
  return (
    <main className="shell" style={{maxWidth:820}}>
      <SiteNav />
      <header className="page-header"><div>
        <div className="accent eyebrow">WEBSITE OPERATOR</div>
        <h1 className="page-title">My TV Tracker — Ownership & Operator</h1>
        <p className="muted page-subtitle">Information about the individual responsible for this website and its advertising.</p>
      </div></header>
      <section className="panel utility-card">
        <h2>Website and operator</h2>
        <p><strong>Website:</strong> <a href="https://www.mytvtracker.app/">www.mytvtracker.app</a></p>
        <p><strong>App / brand:</strong> My TV Tracker</p>
        <p><strong>Website operator:</strong> Kimberte William</p>
        <p><strong>Relationship:</strong> Kimberte William operates and manages the My TV Tracker website and app, including its advertising and marketing activities.</p>
        <h2>Services provided</h2><p>My TV Tracker provides TV show tracking, upcoming episode schedules, personalized recommendations and optional email and browser reminders.</p><h2>Advertising and ownership</h2>
        <p className="muted">Kimberte William is the individual operator responsible for My TV Tracker and its advertising. The owner and product are not separate contracting parties.</p>
        <p className="muted">For questions about this website or its operator, please use the <Link href="/contact">My TV Tracker contact form</Link>.</p>
      </section>
    </main>
  );
}
