import{NextResponse}from"next/server";

const PAGE_COUNT=10;

export async function GET(){
  try{
    const pages=await Promise.all(
      Array.from({length:PAGE_COUNT},(_,page)=>fetch("https://api.tvmaze.com/shows?page="+page,{next:{revalidate:86400}}))
    );
    if(!pages[0]?.ok)return NextResponse.json({error:"TV service unavailable"},{status:502});

    const pageData=await Promise.all(pages.filter(r=>r.ok).map(r=>r.json()));
    const catalog=pageData.flat();

    const episodeResults=await Promise.all(
      catalog.map(async(show:any)=>{
        try{
          const r=await fetch("https://api.tvmaze.com/shows/"+show.id+"/episodes?specials=0",{next:{revalidate:86400}});
          if(!r.ok)return null;
          return {show,episodes:await r.json()};
        }catch{return null}
      })
    );

    const today=new Date().toISOString().slice(0,10);
    const seen=new Set<number>();
    const shows=episodeResults
      .filter((item:any)=>item?.show?.status==="Running")
      .filter((item:any)=>item.episodes?.some((episode:any)=>episode?.airdate&&episode.airdate>=today))
      .map((item:any)=>item.show)
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
