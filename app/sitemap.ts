import type { MetadataRoute } from "next";

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://mytvtracker.app";
  const staticRoutes = ["/", "/today", "/upcoming", "/discover", "/tv-tonight", "/tv-this-week", "/new-episodes", "/new-and-upcoming"];
  let shows: any[] = [];
  try {
    const r = await fetch("https://api.tvmaze.com/schedule/full", { next: { revalidate: 86400 } });
    if (r.ok) shows = await r.json();
  } catch {}

  const unique = new Map<number, any>();
  for (const episode of shows) {
    const show = episode?.show;
    if (show?.id && (show.status === "Running" || show.status === "In Development") && !unique.has(show.id)) {
      unique.set(show.id, show);
    }
  }

  const activeShows = Array.from(unique.values());
  const genres = new Set<string>();
  const services = new Set<string>();

  for (const show of activeShows) {
    for (const genre of show.genres || []) genres.add(slugify(genre));
    const service = show.network?.name || show.webChannel?.name;
    if (service) services.add(slugify(service));
  }

  return [
    ...staticRoutes.map(path => ({
      url: base + path,
      changeFrequency: "daily" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...activeShows.map(show => ({
      url: base + "/shows/" + slugify(show.name),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...Array.from(genres).map(genre => ({
      url: base + "/genres/" + genre,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...Array.from(services).map(service => ({
      url: base + "/streaming/" + service,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
