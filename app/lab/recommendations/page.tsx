import type { Metadata } from "next";
import SiteNav from "@/components/site-nav";
import RecommendationLab from "@/components/recommendation-lab";

export const metadata: Metadata = {
 title: "Recommendations Lab — My TV Tracker",
 description: "Experimental personalized television recommendations.",
 robots: { index: false, follow: false },
};
export default function Page() {
 return <main className="shell"><SiteNav/><header className="page-header"><div><div className="accent eyebrow">REVIEW ONLY · RECOMMENDATIONS LAB</div><h1 className="page-title">Find your next favourite show</h1><p className="muted page-subtitle">Recommendations inspired by shows you love — not just another TV schedule.</p></div></header><RecommendationLab/></main>;
}
