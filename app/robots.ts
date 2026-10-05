import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/login", "/settings/", "/profile", "/my-shows", "/today", "/upcoming"],
    },
    sitemap: "https://www.mytvtracker.app/sitemap.xml",
  };
}
