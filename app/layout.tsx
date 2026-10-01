import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My TV Tracker",
  description: "Track your shows, see what's airing, and discover what to watch next.",
  metadataBase: new URL("https://mytvtracker.app"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
