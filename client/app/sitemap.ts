import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ykayvirtual.com";

// Dynamic sitemap index split by type regenerated on schedule, filtered to published/active/approved only
// For Phase1 placeholder static + attempt to fetch dynamic data

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/programmes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/subjects`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/tutors`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/online-classes`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/for-schools`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/corporate-training`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/careers`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  try {
    // In production fetch from API /programmes, /subjects, /tutors, /blog filtered to published
    // For now return static only; Phase6B will implement split sitemap index
    return staticRoutes;
  } catch {
    return staticRoutes;
  }
}
