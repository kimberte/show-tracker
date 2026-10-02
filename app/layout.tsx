import "./globals.css";
import type { Metadata } from "next";
import PwaRegister from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "My TV Tracker",
  description: "Track your shows, see what's airing, and discover what to watch next.",
  metadataBase: new URL("https://mytvtracker.app"),
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
