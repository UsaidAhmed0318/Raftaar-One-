import {siteUrl} from '@/lib/site';
import type {MetadataRoute} from 'next';
import {launchReady} from '@/lib/config';
export default function robots():MetadataRoute.Robots{const base=siteUrl();return {rules:[{userAgent:'Mediapartners-Google',allow:'/'},{userAgent:'*',allow:launchReady?'/':undefined,disallow:launchReady?['/account','/admin','/cart','/driver','/reset-password','/api/']:'/'}],sitemap:base+'/sitemap.xml'};}