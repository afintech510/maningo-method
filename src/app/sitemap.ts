import { MetadataRoute } from 'next';

const BASE = 'https://www.maningomethod.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/schedule`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/pilates-in-westhampton`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/pilates-in-east-quogue`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/pilates-in-remsenburg`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/gift/new`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
