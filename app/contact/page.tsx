import type { Metadata } from "next";
import SiteNav from "@/components/site-nav";
import ContactForm from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact My TV Tracker for bug reports, feedback, support and other questions.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <main className="shell">
    <SiteNav />
    <header className="page-header"><div>
      <div className="accent eyebrow">GET IN TOUCH</div>
      <h1 className="page-title">Contact My TV Tracker</h1>
      <p className="muted page-subtitle">Found a bug, have a suggestion, or need help? Send us a message.</p>
    </div></header>
    <section className="panel utility-card" style={{maxWidth:720}}>
      <ContactForm />
    </section>
  </main>;
}
