import{NextResponse}from"next/server";

export async function GET(){
  try{
    const r=await fetch("https://api.tvmaze.com/schedule/full",{next:{revalidate:86400}});
    if(!r.ok)return NextResponse.json({error:"TV service unavailable"},{status:502});

    const episodes=await r.json();
    const seen=new Set<number>();
    const shows=episodes
      .map((episode:any)=>episode?.show||episode?._embedded?.show)
      .filter((show:any)=>show?.status==="Running")
      .filter((show:any)=>{
        if(!show?.id||seen.has(show.id))return false;
        seen.add(show.id);
        return true;
      });

    return NextResponse.json(shows);
  }catch{
    return NextResponse.json({error:"TV service unavailable"},{status:502});
  }
}
