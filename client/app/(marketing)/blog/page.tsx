import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Blog — Study Guides, Exam Tips & Learning Insights | YKAY",
    description: "Subject/exam-tagged content engine: IGCSE, WAEC, JAMB, IELTS guides. Tuteria v2 has no blog — YKAY builds SEO growth engine with Article JSON-LD, internal linking.",
    path: "/blog",
  });
}

const posts = [
  { slug: "how-to-score-8-ielts", title: "How to Score 8.0 in IELTS: Techniques Tuteria Tutors Use", excerpt: "IELTS is not English — it's a technique exam. Learn the rarely-taught patterns.", subject: "IELTS", exam: "IELTS", date: "2026-08-01" },
  { slug: "jamb-2026-biology-topics", title: "JAMB 2026 Biology: 15 Years of Past Questions Analyzed", excerpt: "Our AI crunched 20k questions. Here are the most predicted topics.", subject: "Biology", exam: "JAMB", date: "2026-07-28" },
  { slug: "british-vs-nigerian-curriculum", title: "British vs Nigerian Curriculum: Which Path for Your Child?", excerpt: "A parent guide to IGCSE vs WAEC, with assessment differences.", subject: "Curriculum", exam: "IGCSE", date: "2026-07-20" },
];

export default function BlogPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Blog", item: "https://ykayvirtual.com/blog" },
  ]);
  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <h1 className="text-4xl font-extrabold">Resources & Blog</h1>
      <p className="mt-4 text-ink-600 max-w-3xl">Tuteria v2 hardcodes SEO copy in JSX. YKAY uses BlogPost CMS with scheduled publishing, subject/exam tagging, related-content tutor↔subject↔programme↔blog component, canonical + Article schema.</p>
      <div className="mt-10 grid md:grid-cols-3 gap-6">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="border rounded-2xl p-6 hover:shadow-lift transition-shadow bg-white">
            <div className="text-xs font-semibold uppercase text-brand-blue">{p.exam} • {p.subject}</div>
            <h3 className="mt-2 font-bold leading-tight">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-600">{p.excerpt}</p>
            <div className="mt-3 text-xs text-ink-400">{p.date}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
