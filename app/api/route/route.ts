import {NextRequest,NextResponse} from 'next/server';
import {limited,TtlCache} from '@/lib/server-guard';
import {inPakistan,distanceKm} from '@/lib/geo';
export const runtime='nodejs';
type Out={distance_m:number;duration_s:number;coords:[number,number][];estimated?:boolean};
const cache=new TtlCache<Out>(10*60*1000,500);
const parse=(v:string|null)=>{const [a,b]=(v||'').split(',').map(Number);return Number.isFinite(a)&&Number.isFinite(b)?{lat:a,lng:b}:null;};
function thin(coords:[number,number][],max=350){if(coords.length<=max)return coords;const step=Math.ceil(coords.length/max);const out=coords.filter((_,i)=>i%step===0);const last=coords[coords.length-1];if(out[out.length-1]!==last)out.push(last);return out;}
export async function GET(req:NextRequest){
 const from=parse(req.nextUrl.searchParams.get('from')),to=parse(req.nextUrl.searchParams.get('to'));
 if(!from||!to||!inPakistan(from)||!inPakistan(to))return NextResponse.json({error:'Both points must be inside Pakistan.'},{status:400});
 if(limited(req,80))return NextResponse.json({error:'Too many requests.'},{status:429});
 const straight=distanceKm(from,to);
 if(straight>1500)return NextResponse.json({error:'These points are too far apart.'},{status:400});
 const key=[from.lat,from.lng,to.lat,to.lng].map(n=>n.toFixed(4)).join(',');
 const hit=cache.get(key);if(hit)return NextResponse.json(hit,{headers:{'Cache-Control':'private, max-age=30'}});
 try{
  const url='https://router.project-osrm.org/route/v1/driving/'+from.lng+','+from.lat+';'+to.lng+','+to.lat+'?overview=full&geometries=geojson&alternatives=false&steps=false';
  const res=await fetch(url,{headers:{'User-Agent':'RaftaarOne/1.0'},signal:AbortSignal.timeout(7000)});
  const data=await res.json() as {code:string;routes?:{distance:number;duration:number;geometry:{coordinates:[number,number][]}}[]};
  const r=data.routes?.[0];
  if(!res.ok||data.code!=='Ok'||!r)throw new Error('no route');
  const out:Out={distance_m:Math.round(r.distance),duration_s:Math.round(r.duration),coords:thin(r.geometry.coordinates.map(([lng,lat])=>[lat,lng] as [number,number]))};
  cache.set(key,out);
  return NextResponse.json(out,{headers:{'Cache-Control':'private, max-age=30'}});
 }catch{
  // Routing service unavailable: fall back to a straight-line estimate so booking still works.
  const distance_m=Math.round(straight*1000*1.35);
  return NextResponse.json({distance_m,duration_s:Math.round(distance_m/8),coords:[[from.lat,from.lng],[to.lat,to.lng]],estimated:true} satisfies Out);
 }
}
