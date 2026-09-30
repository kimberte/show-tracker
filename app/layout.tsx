import "./globals.css";
import type {Metadata} from "next";
export const metadata:Metadata={title:"Show Tracker",description:"Never miss when your shows are on."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}