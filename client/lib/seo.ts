import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ykayvirtual.com";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}

type MetaTemplate = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
};

export function buildMetadata({ title, description, path, image, noIndex, canonical }: MetaTemplate): Metadata {
  const url = absoluteUrl(path);
  const canonicalUrl = canonical || url;
  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "YKAY Virtual School",
      images: image ? [{ url: image }] : [{ url: absoluteUrl("/og-default.jpg") }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [absoluteUrl("/og-default.jpg")],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

// JSON-LD builders (Organization, Course, Person+AggregateRating, FAQPage, BreadcrumbList, Article, Review)

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "YKAY Virtual School",
    url: SITE_URL,
    logo: absoluteUrl("/logo.png"),
    description: "British & Nigerian curriculum learning, examination preparation and expert private tuition online.",
    sameAs: [
      "https://twitter.com/ykayvirtual",
      "https://facebook.com/ykayvirtual",
      "https://instagram.com/ykayvirtual",
      "https://linkedin.com/company/ykayvirtual",
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; item: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

export function courseJsonLd({ name, description, provider, url, image }: { name: string; description: string; provider: string; url: string; image?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    provider: {
      "@type": "Organization",
      name: provider,
      sameAs: SITE_URL,
    },
    url,
    image,
  };
}

export function personJsonLd({ name, description, image, ratingValue, ratingCount, url }: { name: string; description?: string; image?: string; ratingValue?: number; ratingCount?: number; url: string }) {
  const base: any = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    description,
    image,
    url,
  };
  if (ratingValue && ratingCount) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue,
      reviewCount: ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return base;
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

export function articleJsonLd({ headline, description, datePublished, dateModified, author, image, url }: { headline: string; description: string; datePublished: string; dateModified?: string; author: string; image?: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image,
    author: { "@type": "Person", name: author },
    publisher: { "@type": "Organization", name: "YKAY Virtual School", logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png") } },
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: url,
  };
}

export function reviewJsonLd({ itemName, ratingValue, author, reviewBody }: { itemName: string; ratingValue: number; author: string; reviewBody: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Person", name: itemName },
    reviewRating: { "@type": "Rating", ratingValue, bestRating: 5 },
    author: { "@type": "Person", name: author },
    reviewBody,
  };
}
