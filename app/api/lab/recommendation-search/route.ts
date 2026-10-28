import { NextResponse } from "next/server";
export async function GET(request: Request) {
 const q = new URL(request.url).searchParams.get("q")?.trim() || "";
 if (q.length < 2 || q.length > 80) return NextResponse.json([]);
 try {
  const r = await fetch("https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q), { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return NextResponse.json([], { status: 502 });
  const data = await r.json();
  return NextResponse.json((Array.isArray(data) ? data : []).slice(0, 12).map((x: any) => x.show).filter((s: any) => s?.id && s?.name));
 } catch { return NextResponse.json([], { status: 502 }); }
}
