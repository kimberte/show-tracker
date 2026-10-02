import { NextResponse } from "next/server";

type Show = {
  id: number;
  name: string;
  status?: string;
  [key: string]: any;
};

const searchableStatuses = new Set(["Running", "In Development"]);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  try {
    const [searchResponse, singleResponse, scheduleResponse] = await Promise.all([
      fetch("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q), {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.tvmaze.com/singlesearch/shows?q=" + encodeURIComponent(q), {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.tvmaze.com/schedule/full", {
        next: { revalidate: 86400 },
      }),
    ]);

    if (!searchResponse.ok) {
      return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });
    }

    const searchData = await searchResponse.json();
    const exactShow = singleResponse.ok ? await singleResponse.json() : null;
    const scheduleEpisodes = scheduleResponse.ok ? await scheduleResponse.json() : [];
    const today = new Date().toLocaleDateString("en-CA");

    // Only active shows are searchable. A Running show remains searchable
    // between seasons even when it has no future episode scheduled yet.
    const matches: Show[] = searchData
      .map((x: any) => x.show)
      .filter((show: Show) => show && searchableStatuses.has(show.status));

    // TVMaze's single-search endpoint helps exact/near-exact titles such as
    // "Star Trek: Strange New Worlds" when regular search ranking omits it.
    if (
      exactShow &&
      searchableStatuses.has(exactShow.status) &&
      !matches.some((item) => item.id === exactShow.id)
    ) {
      matches.unshift(exactShow);
    }

    // Keep the schedule fallback for active shows that appear in the schedule
    // but aren't returned by TVMaze's search endpoint.
    for (const episode of scheduleEpisodes) {
      const show = episode?.show || episode?._embedded?.show;
      if (
        show?.id &&
        searchableStatuses.has(show.status) &&
        episode?.airdate &&
        episode.airdate >= today &&
        typeof show.name === "string" &&
        show.name.toLowerCase().includes(q.toLowerCase()) &&
        !matches.some((item) => item.id === show.id)
      ) {
        matches.push(show);
      }
    }

    return NextResponse.json(matches.slice(0, 20));
  } catch {
    return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });
  }
}
