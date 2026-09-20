import type {MetadataRoute} from 'next';
import {launchReady} from '@/lib/config';
export default function sitemap():MetadataRoute.Sitemap{
 if(!launchReady)return [];
 const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';
 return ['','/book','/marketplace','/partner','/help','/privacy','/terms'].map(route=>({url:base+route,changeFrequency:'weekly',priority:route===''?1:0.7}));
}