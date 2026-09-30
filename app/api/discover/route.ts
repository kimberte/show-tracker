import{NextResponse}from"next/server";

export async function GET(){
  try{
    const r=await fetch("https://api.tvmaze.com/schedule/full",{next:{revalidate:86400}});
    if(!r.ok)return NextResponse.json({error:"TV service unavailable"},{status:502});

    const episodes=await r.json();
    const today=new Date().toISOString().slice(0,10);
    const seen=new Set<number>();
    const shows=episodes
      .filter((episode:any)=>episode?.show?.status==="Running"&&episode?.airdate&&episode.airdate>=today)
      .map((episode:any)=>episode.show)
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
