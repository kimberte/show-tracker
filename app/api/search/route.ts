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
    // Keep search to one TVMaze request. The previous implementation also
    // waited for a full TV schedule and several redundant searches, making
    // every query slow or completely empty when any one upstream call stalled.
    const response = await fetch(
      "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q),
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) }
    );
    
    if (!response.ok) {
      return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });
    }

    const data = await response.json();
    const uniqueShows = new Map<number, Show>();
    
    for (const item of data) {
      const show = item?.show;
      if (
        show?.id &&
        typeof show.name === "string" &&
        typeof show.status === "string" &&
        searchableStatuses.has(show.status)
      ) {
        uniqueShows.set(show.id, show);
      }
    }

    const queryWords = q.toLowerCase().split(/\s+/g).filter(Boolean);
    const matches = Array.from(uniqueShows.values()).sort((a, b) => {
      const score = (show: Show) => {
        const name = show.name.toLowerCase();
        if (name.includes(q.toLowerCase())) return 0;
        if (queryWords.every((word) => name.includes(word))) return 1;
        return 2;
      };
      return score(a) - score(b) || a.name.localeCompare(b.name);
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("TVMaze search failed:", error);
    return NextResponse.json({ error: "Search is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
