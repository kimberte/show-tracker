import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: {
    default: "My TV Tracker — Never Miss When Your Shows Are On",
    template: "%s | My TV Tracker",
  },
  description:
    "Track your favourite TV shows, see what's airing today, discover what's coming next, and get a personal daily TV schedule.",
  metadataBase: new URL("https://mytvtracker.app"),
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "My TV Tracker",
    title: "My TV Tracker — Never Miss When Your Shows Are On",
    description:
      "Track your shows, see what's airing, discover what to watch next, and get your personal TV schedule by email.",
    url: "https://mytvtracker.app",
  },
  twitter: {
    card: "summary",
    title: "My TV Tracker — Never Miss When Your Shows Are On",
    description:
      "Track your shows and stay on top of what airs today and what's coming next.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
