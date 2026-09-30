import{NextResponse}from"next/server";

export async function GET(){
  const r=await fetch("https://api.tvmaze.com/shows?page=0",{next:{revalidate:3600}});
  if(!r.ok)return NextResponse.json({error:"TV service unavailable"},{status:502});
  const shows=await r.json();
  return NextResponse.json(shows);
}
