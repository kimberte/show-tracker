import Link from "next/link";
import SiteNav from "@/components/site-nav";

const faqs = [
  ["Do I need an account to browse?", "No. You can search, discover shows, and browse the public TV guide without signing in. Sign in when you want to track shows or use personal reminders."],
  ["How do reminders work?", "You can enable browser notifications for your device and/or a daily email. Your notification settings control whether those reminders are active."],
  ["Can I track any TV show?", "The tracker uses TVMaze show data, so availability depends on the information TVMaze provides. Search is intentionally broad, while Discover defaults to English-language North American programming."],
  ["Why is an episode date or time missing?", "Networks and streaming services do not always announce complete schedules in advance. When TVMaze does not have a date or time, My TV Tracker cannot reliably invent one."],
  ["Is My TV Tracker free?", "Yes. The core tracker is free to use."],
  ["Can I remove a show?", "Yes. Open My Shows and choose Remove on any tracked show."],
];

export default function FaqPage() {
  return (
    <main className="shell">
      <SiteNav />
      <header className="page-header">
        <div>
          <div className="accent eyebrow">HELP & FAQ</div>
          <h1 className="page-title">Frequently asked questions</h1>
          <p className="muted page-subtitle">A quick guide to tracking shows, schedules, and reminders.</p>
        </div>
      </header>
      <section className="faq-list">
        {faqs.map(([question, answer]) => (
          <article className="panel faq-item" key={question}>
            <h2>{question}</h2>
            <p className="muted">{answer}</p>
          </article>
        ))}
      </section>
      <section className="panel utility-card utility-cta">
        <h2>Ready to start?</h2>
        <p className="muted">Search for a show and build your personal TV schedule.</p>
        <Link href="/" className="primary-button">Find shows</Link>
      </section>
    </main>
  );
}
