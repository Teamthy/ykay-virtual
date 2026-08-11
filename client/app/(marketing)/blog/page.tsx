import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { apiFetchSSR } from "@/lib/api";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Blog — Study Guides, Exam Tips & Learning Insights | YKAY",
  description:
    "Subject/exam-tagged study guides and exam prep insights: IGCSE, WAEC, NECO, JAMB, IELTS, A-Level and more — from the YKAY academic team.",
  path: "/blog",
});

type BlogPostDTO = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  published_at?: string;
  subject_slugs?: string[];
  exam_slugs?: string[];
};

// Fallback content when the API is unavailable (never fabricate claims).
const fallbackPosts: BlogPostDTO[] = [
  {
    id: "1",
    slug: "how-to-score-8-ielts",
    title: "How to Score 8.0 in IELTS: Techniques Our Tutors Use",
    excerpt: "IELTS is not English — it's a technique exam. Learn the patterns our tutors teach.",
    subject_slugs: ["ielts-prep"],
    exam_slugs: ["IELTS"],
    published_at: "2026-08-01",
  },
  {
    id: "2",
    slug: "jamb-2026-biology-topics",
    title: "JAMB 2026 Biology: Most-Predicted Topics",
    excerpt: "Fifteen years of past questions analysed to find the highest-yield topics.",
    subject_slugs: ["biology"],
    exam_slugs: ["JAMB"],
    published_at: "2026-07-28",
  },
  {
    id: "3",
    slug: "british-vs-nigerian-curriculum",
    title: "British vs Nigerian Curriculum: Which Path for Your Child?",
    excerpt: "A parent guide to IGCSE vs WAEC, with assessment differences and how to choose.",
    subject_slugs: ["english-language"],
    exam_slugs: ["IGCSE"],
    published_at: "2026-07-20",
  },
];

export default async function BlogPage() {
  let posts: BlogPostDTO[] = fallbackPosts;
  try {
    const res = await apiFetchSSR<BlogPostDTO[]>("/content/blog?page=1&page_size=50");
    if (res.data && res.data.length > 0) posts = res.data;
  } catch {
    // API down → fallback list (still SEO-safe, no fake claims)
  }

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />
      <h1 className="text-4xl font-extrabold">Resources & Blog</h1>
      <p className="mt-4 text-ink-600 max-w-3xl">
        Study guides, exam-prep strategies and curriculum insights — written by our academic team and tagged by
        subject and exam for easy discovery.
      </p>
      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="border rounded-2xl p-6 hover:shadow-lift hover:border-brand-blue/40 transition-all bg-white"
          >
            <div className="text-xs font-semibold uppercase text-brand-blue">
              {(p.exam_slugs ?? []).join(" • ") || (p.subject_slugs ?? []).join(" • ")}
            </div>
            <h3 className="mt-2 font-bold leading-tight line-clamp-3">{p.title}</h3>
            {p.excerpt && <p className="mt-2 text-sm text-ink-600 line-clamp-3">{p.excerpt}</p>}
            {p.published_at && <div className="mt-3 text-xs text-ink-400">{p.published_at.slice(0, 10)}</div>}
          </Link>
        ))}
      </div>
    </main>
  );
}
