import Link from "next/link";
import SiteNav from "@/components/site-nav";
import TvBotMark from "@/components/tv-bot-mark";
export const metadata={title:"Install My TV Tracker",description:"Add My TV Tracker to your Android or iPhone home screen."};
export default function InstallPage(){
 return <main className="shell"><SiteNav/>
 <header className="page-header"><div><div className="accent eyebrow">QUICK ACCESS</div><h1 className="page-title">Install My TV Tracker</h1><p className="muted page-subtitle">Your shows, one tap away.</p></div></header>
 <section className="panel install-guide-panel">
 <div className="install-guide-brand"><TvBotMark size={54}/><strong>My TV Tracker</strong></div>
 <div className="install-guide-step"><h2>iPhone &amp; iPad</h2><p>Open <strong>mytvtracker.app</strong> in Safari. Tap <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p></div>
 <div className="install-guide-step"><h2>Android</h2><p>Open <strong>mytvtracker.app</strong> in Chrome. Tap the <strong>⋮ menu</strong>, then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p></div>
 <p className="muted install-guide-note">Already installed? Keep using it. If the icon doesn't update, reinstall the shortcut.</p>
 <div className="install-guide-footer"><Link href="/profile" className="nav-pill">Back to profile</Link></div>
 </section></main>;
}
