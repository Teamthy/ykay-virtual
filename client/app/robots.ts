import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://nuvora.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/subjects/", "/programmes/", "/tutors/", "/blog/", "/online-classes", "/for-schools", "/corporate-training", "/careers", "/become-tutor"],
        disallow: [
          "/admin",
          "/api",
          "/dashboard",
          "/tutor-dashboard",
          "/messages",
          "/notifications",
          "/checkout",
          "/offline",
          "/account",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
