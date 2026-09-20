import {NextRequest,NextResponse} from 'next/server';
export const runtime='nodejs';
type CacheEntry={data:unknown;ts:number};
const cache=new Map<string,CacheEntry>();
const CACHE_MS=10*60*1000;
const MAX_CACHE=500;
type NominatimResult={place_id:number;display_name:string;lat:string;lon:string;type:string;address?:Record<string,string>};
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim();
 if(q.length<3||q.length>120) return NextResponse.json({results:[]},{headers:{'Cache-Control':'no-store'}});
 const key=q.toLowerCase();
 const cached=cache.get(key);
 if(cached&&Date.now()-cached.ts<CACHE_MS) return NextResponse.json({results:cached.data},{headers:{'Cache-Control':'private, max-age=60'}});
 try{
  const url=new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q',q);
  url.searchParams.set('format','jsonv2');
  url.searchParams.set('addressdetails','1');
  url.searchParams.set('countrycodes','pk');
  url.searchParams.set('limit','8');
  const site=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';
  const res=await fetch(url,{headers:{'User-Agent':'RaftaarOne/1.0 ('+site+')','Accept-Language':'en'},signal:AbortSignal.timeout(6000)});
  if(!res.ok) return NextResponse.json({results:[]},{headers:{'Cache-Control':'no-store'}});
  const data=await res.json() as NominatimResult[];
  const results=data.map(d=>({id:d.place_id,label:d.display_name,lat:d.lat,lon:d.lon,city:d.address?.city||d.address?.town||d.address?.village||d.address?.county||''}));
  if(cache.size>=MAX_CACHE){const oldest=cache.keys().next().value;if(oldest!==undefined) cache.delete(oldest);}
  cache.set(key,{data:results,ts:Date.now()});
  return NextResponse.json({results},{headers:{'Cache-Control':'private, max-age=60'}});
 }catch{
  return NextResponse.json({results:[]},{headers:{'Cache-Control':'no-store'}});
 }
}
