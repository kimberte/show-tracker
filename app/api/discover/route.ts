import { NextResponse } from "next/server";

export async function GET() {
  try {
    const r = await fetch("https://api.tvmaze.com/schedule/full", {
      next: { revalidate: 86400 },
    });

    if (!r.ok) {
      return NextResponse.json(
        { error: "TV service unavailable" },
        { status: 502 }
      );
    }

    const episodes = await r.json();
    const today = new Date().toLocaleDateString("en-CA");
    const byShow = new Map<number, any>();

    for (const episode of episodes) {
      const show = episode?.show || episode?._embedded?.show;
      if (!show?.id || show.status !== "Running") continue;

      const existing = byShow.get(show.id);

      if (!existing) {
        byShow.set(show.id, {
          show,
          nextEpisode:
            episode.airdate && episode.airdate >= today ? episode : null,
        });
        continue;
      }

      if (
        episode.airdate &&
        episode.airdate >= today &&
        (!existing.nextEpisode ||
          episode.airdate + (episode.airtime || "") <
            existing.nextEpisode.airdate +
              (existing.nextEpisode.airtime || ""))
      ) {
        existing.nextEpisode = episode;
      }
    }

    const shows = Array.from(byShow.values()).map(({ show, nextEpisode }) => ({
      ...show,
      _discoverStatus: nextEpisode
        ? nextEpisode.airdate === today
          ? "Airing today"
          : "Airing soon"
        : "On hiatus",
      _nextAirdate: nextEpisode?.airdate || null,
      _nextAirtime: nextEpisode?.airtime || null,
    }));

    return NextResponse.json(shows);
  } catch {
    return NextResponse.json(
      { error: "TV service unavailable" },
      { status: 502 }
    );
  }
}