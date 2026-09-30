import "./globals.css";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Show Tracker",description:"Track your shows, see what's airing, and discover what to watch next."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
