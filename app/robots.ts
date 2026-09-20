import type {MetadataRoute} from 'next';
import {launchReady} from '@/lib/config';
export default function robots():MetadataRoute.Robots{const base=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000';return {rules:{userAgent:'*',allow:launchReady?'/':undefined,disallow:launchReady?['/account','/admin','/cart','/reset-password','/api/']:'/'},sitemap:base+'/sitemap.xml'};}