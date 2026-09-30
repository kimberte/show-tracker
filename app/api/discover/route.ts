import{NextResponse}from"next/server";

const PAGE_COUNT=10;

export async function GET(){
  try{
    const pages=await Promise.all(
      Array.from({length:PAGE_COUNT},(_,page)=>fetch("https://api.tvmaze.com/shows?page="+page,{next:{revalidate:3600}}))
    );
    if(!pages[0]?.ok)return NextResponse.json({error:"TV service unavailable"},{status:502});
    const results=await Promise.all(pages.filter(r=>r.ok).map(r=>r.json()));
    const seen=new Set<number>();
    const shows=results.flat().filter((show:any)=>{
      if(show?.status!=="Running"||seen.has(show.id))return false;
      seen.add(show.id);
      return true;
    });
    return NextResponse.json(shows);
  }catch{
    return NextResponse.json({error:"TV service unavailable"},{status:502});
  }
}
