import type { Metadata } from "next";
import { buildMetadata, articleJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InnerHero } from "@/components/layout/InnerHero";
import { RelatedContent } from "@/components/RelatedContent";

export const revalidate = 600;

type Props = { params: Promise<{ slug: string }> };

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
  "jamb-2026-biology-topics": {
    id: "2",
    title: "JAMB 2026 Biology: Most-Predicted Topics",
    slug: "jamb-2026-biology-topics",
    excerpt: "Fifteen years of past questions analysed to find the highest-yield topics.",
    content:
      "A breakdown of the highest-yield Biology topics based on an analysis of past JAMB papers, with a structured revision plan.",
    seo_title: "JAMB 2026 Biology: Most-Predicted Topics",
    seo_description: "Highest-yield JAMB Biology topics and a structured revision plan.",
    published_at: "2026-07-28T00:00:00Z",
    subject_slugs: ["biology"],
    exam_slugs: ["JAMB"],
  },
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
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
    title: post.seo_title ?? `${post.title} | NUVORA Blog`,
    description: post.seo_description ?? post.excerpt ?? "",
    path: `/blog/${params.slug}`,
  });
}

export default async function BlogSlugPage(props: Props) {
  const params = await props.params;
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
    author: "NUVORA Academic Team",
    url: `https://nuvora.com/blog/${params.slug}`,
  });

  const primarySubject = post.subject_slugs?.[0];

  return (
    <main className="container-x py-12 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }]} />
      <InnerHero>
        <div className="text-xs uppercase font-semibold text-brand-blue">
          {(post.exam_slugs ?? []).join(" • ")}
        </div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>
        {post.published_at && (
          <div className="mt-3 text-sm text-ink-400">
            Published {new Date(post.published_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        )}
      </InnerHero>
      <article className="mt-8 prose prose-lg max-w-none text-ink-700 leading-relaxed whitespace-pre-line">
        {post.content}
      </article>
      {primarySubject && <RelatedContent subjectSlug={primarySubject} />}
    </main>
  );
}
