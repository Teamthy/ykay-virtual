import type { MetadataRoute } from "next";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nuvora.com";
const now = new Date();

// Dynamic sitemap — static pages + live tutors/subjects/programmes/blog,
// filtered to published/active/approved only (the API only ever returns those).
// Fixes Tuteria's soft-404 sitemap bug and keeps search indexes clean.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/tutors`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/subjects`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/programmes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/online-classes`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/for-schools`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/corporate-training`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/careers`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE}/help`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/become-tutor`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/sat`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/ielts-toefl`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/gre`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const fetchType = async (path: string, key: string): Promise<string[]> => {
    try {
      const res = await apiFetchSSR<Record<string, unknown>[]>(`${path}?page=1&page_size=100`);
      return (res.data ?? []).map((d) => String((d as Record<string, unknown>)[key])).filter(Boolean);
    } catch {
      return [];
    }
  };

  const [tutors, subjects, programmes, posts] = await Promise.all([
    fetchType("/tutors/search?sort=newest", "slug"),
    fetchType("/subjects", "slug"),
    fetchType("/programmes?sort=newest", "slug"),
    fetchType("/content/blog", "slug"),
  ]);

  for (const slug of tutors) entries.push({ url: `${SITE}/tutors/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  for (const slug of subjects) entries.push({ url: `${SITE}/subjects/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 });
  for (const slug of programmes) entries.push({ url: `${SITE}/programmes/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  for (const slug of posts) entries.push({ url: `${SITE}/blog/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });

  return entries;
}
