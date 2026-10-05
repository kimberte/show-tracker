import type { MetadataRoute } from "next";

const base = "https://www.mytvtracker.app";

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/discover", "/tv-tonight", "/tv-this-week", "/new-episodes", "/new-and-upcoming"];
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

  const today = new Date().toISOString().slice(0, 10);

  return [
    ...staticRoutes.map(path => ({
      url: base + path,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: path === "/" ? 1 : 0.8,
    })),
    ...activeShows.map(show => ({
      url: base + "/shows/" + slugify(show.name),
      lastModified: show.updated ? new Date(show.updated * 1000) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...Array.from(genres).map(genre => ({
      url: base + "/genres/" + genre,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...Array.from(services).map(service => ({
      url: base + "/streaming/" + service,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
