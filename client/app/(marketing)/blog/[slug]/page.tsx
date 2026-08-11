import type { Metadata } from "next";
import { buildMetadata, articleJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";
import { apiFetchSSR } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedContent } from "@/components/RelatedContent";

export const revalidate = 600;

type Props = { params: { slug: string } };

type BlogPostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
  subject_slugs?: string[];
  exam_slugs?: string[];
};

const fallback: Record<string, BlogPostDTO> = {
  "how-to-score-8-ielts": {
    id: "1",
    title: "How to Score 8.0 in IELTS: Techniques Our Tutors Use",
    slug: "how-to-score-8-ielts",
    excerpt: "IELTS is not your usual English exam — it's a technique exam.",
    content:
      "This guide covers the four IELTS bands and the techniques our tutors teach: question-pattern recognition for Reading, signpost words for Listening, the two-part answer structure for Writing, and fluency-building for Speaking. Combine these with weekly timed mocks and you can raise your band score within six weeks.",
    seo_title: "How to Score 8.0 in IELTS — Techniques & Patterns",
    seo_description: "IELTS preparation techniques: reading patterns, listening signposts, writing structure, speaking fluency.",
    published_at: "2026-08-01T00:00:00Z",
    subject_slugs: ["ielts-prep"],
    exam_slugs: ["IELTS"],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let post: BlogPostDTO | null = null;
  try {
    const res = await apiFetchSSR<BlogPostDTO>(`/content/blog/${params.slug}`);
    post = res.data;
  } catch {
    post = fallback[params.slug] ?? null;
  }
  if (!post) {
    return buildMetadata({ title: "Post Not Found", description: "Not found", path: `/blog/${params.slug}`, noIndex: true });
  }
  return buildMetadata({
    title: post.seo_title ?? `${post.title} | YKAY Blog`,
    description: post.seo_description ?? post.excerpt ?? "",
    path: `/blog/${params.slug}`,
  });
}

export default async function BlogSlugPage({ params }: Props) {
  let post: BlogPostDTO | null = null;
  try {
    const res = await apiFetchSSR<BlogPostDTO>(`/content/blog/${params.slug}`);
    post = res.data;
  } catch {
    post = fallback[params.slug] ?? null;
  }
  if (!post) return notFound();

  const article = articleJsonLd({
    headline: post.title,
    description: post.excerpt ?? "",
    datePublished: post.published_at ?? new Date().toISOString(),
    author: "YKAY Academic Team",
    url: `https://ykayvirtual.com/blog/${params.slug}`,
  });

  const primarySubject = post.subject_slugs?.[0];

  return (
    <main className="container-x py-12 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }]} />
      <div className="text-xs uppercase font-semibold text-brand-blue">
        {(post.exam_slugs ?? []).join(" • ")}
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold mt-2 leading-tight">{post.title}</h1>
      {post.published_at && (
        <div className="mt-3 text-sm text-ink-400">
          Published {new Date(post.published_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
        </div>
      )}
      <article className="mt-8 prose prose-lg max-w-none text-ink-700 leading-relaxed whitespace-pre-line">
        {post.content}
      </article>
      {primarySubject && <RelatedContent subjectSlug={primarySubject} />}
    </main>
  );
}
