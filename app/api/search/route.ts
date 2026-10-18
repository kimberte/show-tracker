import { NextResponse } from "next/server";

type Show = {
  id: number;
  name: string;
  status?: string;
  [key: string]: any;
};

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  
  try {
    // Keep search to one TVMaze request. The previous implementation also
    // waited for a full TV schedule and several redundant searches, making
    // every query slow or completely empty when any one upstream call stalled.
    let response: Response | null = null;
    let lastError: unknown = null;

    // TVMaze occasionally resets or stalls requests under load. Retry once
    // with a short backoff so transient upstream failures don't break search.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetch(
          "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q),
          {
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(7000),
            headers: { Accept: "application/json" },
          }
        );
        if (response.ok) break;
        if (response.status !== 429 && response.status < 500) break;
        lastError = new Error(`TVMaze returned HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
      }

      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    if (!response?.ok) {
      console.error("TVMaze search unavailable:", lastError || response?.status);
      return NextResponse.json(
        { error: "Search is temporarily unavailable. Please try again in a moment." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const uniqueShows = new Map<number, Show>();
    
    for (const item of data) {
      const show = item?.show;
      // Search should find shows regardless of status. Discover can apply its
      // own active-show defaults, but explicit searches must include ended shows.
      if (show?.id && typeof show.name === "string") {
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
