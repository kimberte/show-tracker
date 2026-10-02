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
    const terms = Array.from(new Set([q, ...q.split(/\\s+/).filter((term) => term.length >= 3)]));
    const searchResponses = await Promise.all(
      terms.map((term) =>
        fetch("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(term), {
          next: { revalidate: 3600 },
        })
      )
    );
    const [singleResponse, scheduleResponse] = await Promise.all([
      fetch("https://api.tvmaze.com/singlesearch/shows?q=" + encodeURIComponent(q), {
        next: { revalidate: 3600 },
      }),
      fetch("https://api.tvmaze.com/schedule/full", {
        next: { revalidate: 86400 },
      }),
    ]);

    const searchDataSets = await Promise.all(
      searchResponses
        .filter((response) => response.ok)
        .map((response) => response.json())
    );
    const searchData = searchDataSets.flat();
    const exactShow = singleResponse.ok ? await singleResponse.json() : null;
    const scheduleEpisodes = scheduleResponse.ok ? await scheduleResponse.json() : [];
    const today = new Date().toLocaleDateString("en-CA");

    // Only active shows are searchable. A Running show remains searchable
    // between seasons even when it has no future episode scheduled yet.
    const uniqueShows = new Map<number, Show>();
    for (const item of searchData) {
      const show = item?.show;
      if (
        show?.id &&
        typeof show.status === "string" &&
        searchableStatuses.has(show.status)
      ) {
        uniqueShows.set(show.id, show);
      }
    }

    const queryWords = q.toLowerCase().split(/\\s+/).filter(Boolean);
    const matches: Show[] = Array.from(uniqueShows.values()).sort((a, b) => {
      const score = (show: Show) => {
        const name = show.name.toLowerCase();
        const allWords = queryWords.every((word) => name.includes(word));
        const phrase = name.includes(q.toLowerCase());
        if (phrase) return 0;
        if (allWords) return 1;
        return 2;
      };
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });

    // TVMaze's single-search endpoint helps exact/near-exact titles such as
    // "Star Trek: Strange New Worlds" when regular search ranking omits it.
    if (
      exactShow &&
      typeof exactShow.status === "string" && searchableStatuses.has(exactShow.status) &&
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

    return NextResponse.json(matches);
  } catch {
    return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });
  }
}
