import type { MetadataRoute } from "next";
import { getExamPrepPages } from "@/lib/exam-prep-data";
import { API_BASE, SSR_FETCH_TIMEOUT_MS, apiFetchSSR } from "@/lib/server-api";
import { getHelpArticles } from "@/lib/help-data";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://virtual.ykaycollege.com";
const now = new Date();

// Dynamic sitemap - static pages + live tutors/subjects/programmes/blog,
// filtered to published/active/approved only (the API only ever returns those).
// Fixes Tuteria's soft-404 sitemap bug and keeps search indexes clean.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE}/tutors`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE}/subjects`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE}/programmes`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE}/online-classes`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE}/for-schools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/corporate-training`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/careers`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${SITE}/college`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE}/help`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${SITE}/become-tutor`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE}/sat`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE}/gre`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  for (const page of getExamPrepPages())
    entries.push({
      url: `${SITE}/exam-prep/${page.exam}/${page.subject}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });

  // Live entries are BEST-EFFORT: an unreachable or slow API must never fail
  // the build. This route is statically generated, and Next aborts a route
  // that takes more than 60s per attempt ("Failed to build /sitemap.xml/route
  // after 3 attempts" → the whole `next build` exits 1), so every call is
  // hard-bounded by apiFetchSSR's timeout and the failure is swallowed below.
  // A build with the API down ships static + local-help entries only; the ISR
  // window (revalidate 300s) repopulates the live ones after the first
  // request, so crawlers still get the full sitemap.
  const fetchType = async (path: string, key: string): Promise<string[]> => {
    try {
      const res = await apiFetchSSR<Record<string, unknown>[]>(
        `${path}?page=1&page_size=100`,
        // At most 5s per call, and never beyond the global SSR budget — so a
        // tightened SSR_FETCH_TIMEOUT_MS also tightens the build.
        { timeoutMs: Math.min(5000, SSR_FETCH_TIMEOUT_MS) },
      );
      return (res.data ?? [])
        .map((d) => String((d as Record<string, unknown>)[key]))
        .filter(Boolean);
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

  for (const slug of tutors)
    entries.push({
      url: `${SITE}/tutors/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  for (const slug of subjects)
    entries.push({
      url: `${SITE}/subjects/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  for (const slug of programmes)
    entries.push({
      url: `${SITE}/programmes/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  for (const slug of posts)
    entries.push({
      url: `${SITE}/blog/${slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  for (const article of getHelpArticles())
    entries.push({
      url: `${SITE}/help/${article.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });

  return entries;
}
