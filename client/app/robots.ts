import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://ykayvirtual.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/subjects/", "/programmes/", "/tutors/", "/blog/", "/online-classes", "/for-schools", "/corporate-training"],
        disallow: ["/admin", "/api", "/student", "/parent", "/tutor", "/dashboard", "/account"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
