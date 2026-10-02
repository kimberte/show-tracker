import { NextResponse } from "next/server";

export async function GET() {
  try {
    const r = await fetch("https://api.tvmaze.com/schedule/full", {
      next: { revalidate: 21600 },
    });
    if (!r.ok) return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });

    const schedule = await r.json();
    const today = new Date().toLocaleDateString("en-CA");
    const shows = new Map<number, any>();

    for (const episode of schedule) {
      const show = episode?.show || episode?._embedded?.show;
      if (!show?.id || !episode?.airdate || episode.airdate < today) continue;
      if (show.status !== "Running" && show.status !== "In Development") continue;

      const existing = shows.get(show.id);
      if (!existing || episode.airdate < existing._nextAirdate || (episode.airdate === existing._nextAirdate && (episode.airtime || "99:99") < (existing._nextAirtime || "99:99"))) {
        shows.set(show.id, {
          ...show,
          _nextAirdate: episode.airdate,
          _nextAirtime: episode.airtime || null,
          _nextEpisode: episode,
          _isNew: show.status === "In Development",
        });
      }
    }

    return NextResponse.json(
      Array.from(shows.values()).sort((a, b) =>
        (a._nextAirdate + (a._nextAirtime || "")).localeCompare(b._nextAirdate + (b._nextAirtime || ""))
      ).slice(0, 80)
    );
  } catch {
    return NextResponse.json({ error: "TV service unavailable" }, { status: 502 });
  }
}
