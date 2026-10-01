import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://mytvtracker.app";
  const staticRoutes = ["/", "/today", "/upcoming", "/discover", "/tv-tonight", "/tv-this-week", "/new-episodes"];
  let shows: any[] = [];
  try {
    const r = await fetch("https://api.tvmaze.com/schedule/full", { next: { revalidate: 86400 } });
    if (r.ok) shows = await r.json();
  } catch {}

  const unique = new Map<number, any>();
  for (const episode of shows) {
    const show = episode?.show;
    if (show?.id && (show.status === "Running" || show.status === "In Development") && !unique.has(show.id)) unique.set(show.id, show);
  }

  return [
    ...staticRoutes.map(path => ({ url: base + path, changeFrequency: "daily" as const, priority: path === "/" ? 1 : 0.8 })),
    ...Array.from(unique.values()).map(show => ({
      url: base + "/show/" + show.id,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
