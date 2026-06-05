import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: '2026-05-27',
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: '2026-05-25',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];
}
