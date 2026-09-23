import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { apiFetchSSR } from "@/lib/server-api";
import { PageHero } from "@/components/layout/PageHero";
import { BlogNewsletter } from "@/components/home/BlogNewsletter";
import Link from "next/link";
import { ArrowRight, Sparkles, CalendarDays } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Blog - Study Guides, Exam Tips & Learning Insights | YK-Virtual",
  description:
    "Subject/exam-tagged study guides and exam prep insights: IGCSE, WAEC, NECO, JAMB and A-Level - from the YK-Virtual academic team.",
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
    id: "2",
    slug: "jamb-2026-biology-topics",
    title: "JAMB 2026 Biology: Most-Predicted Topics",
    excerpt:
      "Six high-yield Biology units analysed from past JAMB papers - with weights, subtopics and a 90-day revision plan.",
    subject_slugs: ["biology"],
    exam_slugs: ["JAMB"],
    published_at: "2026-07-28",
  },
  {
    id: "3",
    slug: "british-vs-nigerian-curriculum",
    title: "British vs Nigerian Curriculum: Which Path for Your Child?",
    excerpt:
      "A parent guide to IGCSE vs WAEC, with assessment differences and how to choose.",
    subject_slugs: ["english-language"],
    exam_slugs: ["IGCSE"],
    published_at: "2026-07-20",
  },
];

const FEATURED_SLUG = "jamb-2026-biology-topics";

/**
 * Every blog card needs a photo; the API DTO has no image field, so cards
 * resolve a cover from the post's subject/exam tags (falling back to a
 * generic learner photo).
 */
function postImage(p: BlogPostDTO): string {
  if (p.slug === FEATURED_SLUG) return "/home/card-exam.jpg";
  const tags = [...(p.subject_slugs ?? []), ...(p.exam_slugs ?? [])]
    .join(" ")
    .toLowerCase();
  if (tags.includes("biology")) return "/home/card-exam.jpg";
  if (tags.includes("utme") || tags.includes("jamb")) return "/home/card-utme.jpg";
  if (
    tags.includes("british") ||
    tags.includes("igcse") ||
    tags.includes("a-level")
  )
    return "/hero/british.jpg";
  if (
    tags.includes("nigerian") ||
    tags.includes("waec") ||
    tags.includes("neco") ||
    tags.includes("bece")
  )
    return "/hero/nigerian.jpg";
  if (tags.includes("math") || tags.includes("senior")) return "/home/card-ss.jpg";
  return "/hero/student-learning.jpg";
}

function postTag(p: BlogPostDTO): string {
  return (
    (p.exam_slugs ?? []).join(" • ") ||
    (p.subject_slugs ?? []).join(" • ") ||
    "Guide"
  );
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PostCard({ post }: { post: BlogPostDTO }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#0F2A1A]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={postImage(post)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A]/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#D6FF57] backdrop-blur-sm">
          {postTag(post)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15px] font-bold leading-snug text-[#0F2A1A] line-clamp-3">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/70 line-clamp-3">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
          {post.published_at ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0F2A1A]/65">
              <CalendarDays size={12} aria-hidden="true" />
              {formatDate(post.published_at)}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A] transition group-hover:gap-2">
            Read <ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  let posts: BlogPostDTO[] = fallbackPosts;
  try {
    const res = await apiFetchSSR<BlogPostDTO[]>("/content/blog?page=1&page_size=50");
    if (res.data && res.data.length > 0) posts = res.data;
  } catch {
    // API down → fallback list (still SEO-safe, no fake claims)
  }

  const featured = posts.find((p) => p.slug === FEATURED_SLUG) ?? posts[0];
  const rest = featured ? posts.filter((p) => p.id !== featured.id) : posts;

  return (
    <main>
      <PageHero
        cover="/hero/student-learning.jpg"
        eyebrow="From the academic team"
        title="Resources & Blog"
        subtitle="Study guides, exam-prep strategies and curriculum insights - written by our academic team and tagged by subject and exam for easy discovery."
        crumbs={[{ name: "Home", href: "/" }, { name: "Blog" }]}
        align="left"
      />

      <div className="container-x py-12 lg:py-16">
        {/* ── Featured article ── */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group grid overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-soft transition hover:shadow-lift lg:grid-cols-2"
          >
            <div className="relative min-h-[240px] overflow-hidden bg-[#0F2A1A] lg:min-h-[340px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={postImage(featured)}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#D6FF57] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0F2A1A] shadow">
                <Sparkles size={11} aria-hidden="true" /> Featured guide
              </span>
            </div>
            <div className="flex flex-col justify-center p-6 lg:p-10">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">
                {postTag(featured)}
              </span>
              <h2 className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-[1.02] tracking-[-0.01em] text-[#0F2A1A] uppercase">
                {featured.title}
              </h2>
              {featured.excerpt && (
                <p className="mt-4 text-[14px] leading-[1.7] text-[#0F2A1A]/70">
                  {featured.excerpt}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {featured.published_at && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0F2A1A]/65">
                    <CalendarDays size={13} aria-hidden="true" />
                    Published {formatDate(featured.published_at)}
                  </span>
                )}
                <span className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-2.5 text-[12px] font-bold text-white transition group-hover:gap-3">
                  Read the guide <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* ── All guides ── */}
        <div className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-[clamp(1.4rem,2.6vw,2rem)] uppercase leading-[0.95] text-[#0F2A1A]">
              Latest guides
            </h2>
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#0F2A1A]/65">
              {rest.length} {rest.length === 1 ? "guide" : "guides"}
            </span>
          </div>

          {rest.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[20px] border border-black/10 bg-white p-10 text-center">
              <p className="text-[14px] font-bold text-[#0F2A1A]">
                More guides are on the way.
              </p>
              <p className="mt-2 text-[13px] text-[#0F2A1A]/65">
                Subscribe below and you&apos;ll hear first when new study guides publish.
              </p>
            </div>
          )}
        </div>
      </div>

      <BlogNewsletter />
    </main>
  );
}
