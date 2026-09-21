import {siteUrl} from '@/lib/site';
import type {MetadataRoute} from 'next';
import {launchReady} from '@/lib/config';
const pages: [string, number][] = [['', 1], ['/ride', 0.9], ['/book', 0.8], ['/partner', 0.8], ['/marketplace', 0.7], ['/contact', 0.7], ['/help', 0.6], ['/privacy', 0.3], ['/terms', 0.3]];
export default function sitemap(): MetadataRoute.Sitemap {
  if (!launchReady) return [];
  const base = siteUrl();
  return pages.map(([route, priority]) => ({url: base + route, lastModified: new Date(), changeFrequency: 'weekly', priority}));
}
