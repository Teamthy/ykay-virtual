import type { Metadata } from "next";
import { buildMetadata, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";

type Props = { params: { slug: string } };

const fakeDB: Record<string, any> = {
  "how-to-score-8-ielts": {
    title: "How to Score 8.0 in IELTS: Techniques Tuteria Tutors Use",
    description: "IELTS is not your usual English exam. Learn hidden techniques guaranteed to boost score.",
    content: "Full article content with study materials, practice tests. Tuteria average 8.0 band, 95% success.",
    author: "YKAY Academic Team",
    date: "2026-08-01",
    exam: "IELTS",
    subject: "English",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = fakeDB[params.slug];
  if (!post) return buildMetadata({ title: "Post Not Found", description: "Not found", path: `/blog/${params.slug}`, noIndex: true });
  return buildMetadata({
    title: `${post.title} | YKAY Blog`,
    description: post.description,
    path: `/blog/${params.slug}`,
  });
}

export default function BlogSlugPage({ params }: Props) {
  const post = fakeDB[params.slug];
  if (!post) return notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Blog", item: "https://ykayvirtual.com/blog" },
    { name: post.title, item: `https://ykayvirtual.com/blog/${params.slug}` },
  ]);
  const article = articleJsonLd({
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: post.author,
    url: `https://ykayvirtual.com/blog/${params.slug}`,
  });

  return (
    <main className="container-x py-12 max-w-4xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <div className="text-xs uppercase font-semibold text-brand-blue">{post.exam} • {post.subject}</div>
      <h1 className="mt-2 text-4xl font-extrabold leading-tight">{post.title}</h1>
      <div className="mt-4 text-sm text-ink-500">By {post.author} • {post.date}</div>
      <article className="prose mt-8 max-w-none">{post.content}</article>

      <section className="mt-12 border-t pt-8">
        <h3 className="font-bold">Related Tutors • Subjects • Programmes (internal linking)</h3>
        <p className="mt-2 text-sm text-ink-600">RelatedContent component will show tutor↔subject↔programme↔blog graph to boost SEO topical authority — fixing Tuteria weak internal linking.</p>
      </section>
    </main>
  );
}
