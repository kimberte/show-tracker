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
    const [searchResponse, scheduleResponse] = await Promise.all([
      fetch(
        "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q),
        { next: { revalidate: 3600 } }
      ),
      fetch("https://api.tvmaze.com/schedule/full", {
        next: { revalidate: 86400 },
      }),
    ]);

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: "TV service unavailable" },
        { status: 502 }
      );
    }

    const searchData = await searchResponse.json();
    const matches: Show[] = searchData
      .map((x: any) => x.show)
      .filter((show: Show) => show?.status === "Running");

    if (scheduleResponse.ok) {
      const episodes = await scheduleResponse.json();
      const term = q.toLowerCase();

      for (const episode of episodes) {
        const show = episode?.show || episode?._embedded?.show;

        if (
          show?.status === "Running" &&
          typeof show.name === "string" &&
          show.name.toLowerCase().includes(term) &&
          !matches.some((item) => item.id === show.id)
        ) {
          matches.push(show);
        }
      }
    }

    return NextResponse.json(matches.slice(0, 20));
  } catch {
    return NextResponse.json(
      { error: "TV service unavailable" },
      { status: 502 }
    );
  }
}