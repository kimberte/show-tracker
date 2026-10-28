import { NextResponse } from "next/server";
export async function GET(request: Request) {
 const id=Number(new URL(request.url).searchParams.get("id"));
 if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid show"}, {status:400});
 try {
  const r=await fetch("https://api.tvmaze.com/shows/"+id,{next:{revalidate:86400},signal:AbortSignal.timeout(8000)});
  if(!r.ok)return NextResponse.json({error:"Unavailable"},{status:502});
  const s=await r.json();
  return NextResponse.json({id:s.id,name:s.name,genres:s.genres||[],summary:s.summary||"",language:s.language||null,image:s.image||null});
 }catch{return NextResponse.json({error:"Unavailable"},{status:502});}
}
