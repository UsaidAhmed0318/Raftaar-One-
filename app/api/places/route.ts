import {NextRequest,NextResponse} from 'next/server';
import {siteUrl} from '@/lib/site';
import {limited,TtlCache} from '@/lib/server-guard';
import {PAKISTAN_BOUNDS} from '@/lib/geo';
export const runtime='nodejs';
type Result={id:string;label:string;lat:number;lng:number;city:string};
const cache=new TtlCache<Result[]>(10*60*1000,600);
const BBOX=[PAKISTAN_BOUNDS.minLng,PAKISTAN_BOUNDS.minLat,PAKISTAN_BOUNDS.maxLng,PAKISTAN_BOUNDS.maxLat].join(',');
const json=(results:Result[],cacheable=true)=>NextResponse.json({results},{headers:{'Cache-Control':cacheable?'private, max-age=60':'no-store'}});
function inBounds(lat:number,lng:number){return lat>=PAKISTAN_BOUNDS.minLat&&lat<=PAKISTAN_BOUNDS.maxLat&&lng>=PAKISTAN_BOUNDS.minLng&&lng<=PAKISTAN_BOUNDS.maxLng;}
function dedupe(parts:(string|undefined)[]){const out:string[]=[];for(const part of parts){const p=(part||'').trim();if(p&&!out.some(o=>o.toLowerCase()===p.toLowerCase()))out.push(p);}return out;}
async function photon(q:string,lat:string|null,lon:string|null,agent:string):Promise<Result[]>{
 const url=new URL('https://photon.komoot.io/api/');
 url.searchParams.set('q',q);url.searchParams.set('limit','8');url.searchParams.set('lang','en');url.searchParams.set('bbox',BBOX);
 if(lat&&lon&&!isNaN(+lat)&&!isNaN(+lon)){url.searchParams.set('lat',lat);url.searchParams.set('lon',lon);}
 const res=await fetch(url,{headers:{'User-Agent':agent},signal:AbortSignal.timeout(5000)});
 if(!res.ok)return [];
 const data=await res.json() as {features?:{geometry:{coordinates:[number,number]};properties:Record<string,string|number|undefined>}[]};
 return (data.features||[]).flatMap(f=>{
  const [lng,lt]=f.geometry.coordinates;const p=f.properties;
  if(p.countrycode&&String(p.countrycode).toUpperCase()!=='PK')return [];
  if(!inBounds(lt,lng))return [];
  const street=[p.housenumber,p.street].filter(Boolean).join(' ');
  const city=String(p.city||p.town||p.village||p.county||p.state||'');
  const parts=dedupe([String(p.name||''),street,String(p.locality||p.district||p.suburb||''),city,String(p.state||'')]);
  if(!parts.length)return [];
  return [{id:'p'+String(p.osm_type||'')+String(p.osm_id||lng+','+lt),label:parts.join(', '),lat:lt,lng,city}];
 });
}
async function nominatim(q:string,agent:string):Promise<Result[]>{
 const url=new URL('https://nominatim.openstreetmap.org/search');
 url.searchParams.set('q',q);url.searchParams.set('format','jsonv2');url.searchParams.set('addressdetails','1');url.searchParams.set('countrycodes','pk');url.searchParams.set('limit','8');
 const res=await fetch(url,{headers:{'User-Agent':agent,'Accept-Language':'en'},signal:AbortSignal.timeout(6000)});
 if(!res.ok)return [];
 const data=await res.json() as {place_id:number;display_name:string;lat:string;lon:string;address?:Record<string,string>}[];
 return data.flatMap(d=>{const lat=+d.lat,lng=+d.lon;if(!inBounds(lat,lng))return [];const a=d.address||{};return [{id:'n'+d.place_id,label:d.display_name.replace(/, Pakistan$/,''),lat,lng,city:a.city||a.town||a.village||a.county||a.state||''}];});
}
export async function GET(req:NextRequest){
 const q=(req.nextUrl.searchParams.get('q')||'').trim();
 if(q.length<2||q.length>120)return json([],false);
 if(limited(req,60))return NextResponse.json({results:[],error:'Too many searches. Please slow down.'},{status:429,headers:{'Cache-Control':'no-store'}});
 const lat=req.nextUrl.searchParams.get('lat'),lon=req.nextUrl.searchParams.get('lon');
 const biasKey=lat&&lon?(+lat).toFixed(1)+','+(+lon).toFixed(1):'';
 const key=q.toLowerCase()+'|'+biasKey;
 const hit=cache.get(key);if(hit)return json(hit);
 const agent='RaftaarOne/1.0 ('+siteUrl()+')';
 try{
  let results=await photon(q,lat,lon,agent).catch(()=>[] as Result[]);
  if(results.length<4){
   const extra=await nominatim(q,agent).catch(()=>[] as Result[]);
   for(const e of extra){if(!results.some(r=>Math.abs(r.lat-e.lat)<0.0008&&Math.abs(r.lng-e.lng)<0.0008))results.push(e);}
  }
  results=results.slice(0,8);
  if(results.length)cache.set(key,results);
  return json(results,results.length>0);
 }catch{return json([],false);}
}
