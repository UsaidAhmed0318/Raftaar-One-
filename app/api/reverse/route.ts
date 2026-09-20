import {NextRequest,NextResponse} from 'next/server';
import {siteUrl} from '@/lib/site';
import {limited,TtlCache} from '@/lib/server-guard';
import {inPakistan} from '@/lib/geo';
export const runtime='nodejs';
type Out={label:string;city:string};
const cache=new TtlCache<Out>(30*60*1000,800);
export async function GET(req:NextRequest){
 const lat=Number(req.nextUrl.searchParams.get('lat')),lng=Number(req.nextUrl.searchParams.get('lon'));
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||!inPakistan({lat,lng}))return NextResponse.json({error:'Location must be inside Pakistan.'},{status:400});
 if(limited(req,40))return NextResponse.json({error:'Too many requests.'},{status:429});
 const key=lat.toFixed(4)+','+lng.toFixed(4);
 const hit=cache.get(key);if(hit)return NextResponse.json(hit,{headers:{'Cache-Control':'private, max-age=300'}});
 try{
  const url=new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat',String(lat));url.searchParams.set('lon',String(lng));url.searchParams.set('format','jsonv2');url.searchParams.set('zoom','18');url.searchParams.set('addressdetails','1');
  const res=await fetch(url,{headers:{'User-Agent':'RaftaarOne/1.0 ('+siteUrl()+')','Accept-Language':'en'},signal:AbortSignal.timeout(6000)});
  const d=res.ok?await res.json() as {display_name?:string;address?:Record<string,string>}:{};
  const a=d.address||{};
  const label=(d.display_name||'Pinned location').replace(/, Pakistan$/,'').split(', ').slice(0,5).join(', ');
  const out={label,city:a.city||a.town||a.village||a.county||a.state||''};
  cache.set(key,out);
  return NextResponse.json(out,{headers:{'Cache-Control':'private, max-age=300'}});
 }catch{return NextResponse.json({label:'Pinned location ('+lat.toFixed(4)+', '+lng.toFixed(4)+')',city:''});}
}
