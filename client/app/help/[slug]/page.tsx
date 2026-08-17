import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, LifeBuoy } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InnerHero } from "@/components/layout/InnerHero";
import { buildMetadata } from "@/lib/seo";
import { getHelpArticle, getHelpArticles } from "@/lib/help-data";

// Help article pages — one indexable URL per FAQ (from lib/help-data.ts, the
// single source of truth). Content is the same factual answers as /help, so the
// two never drift.

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getHelpArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) {
    return buildMetadata({
      title: "Help article not found | NUVORA",
      description: "This help article could not be found.",
      path: `/help/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${article.q} | NUVORA Help`,
    description: article.a.length > 150 ? `${article.a.slice(0, 147)}…` : article.a,
    path: `/help/${article.slug}`,
  });
}

export default async function HelpArticlePage(props: Props) {
  const { slug } = await props.params;
  const article = getHelpArticle(slug);
  if (!article) return notFound();

  const related = getHelpArticles().filter(
    (a) => a.category.id === article.category.id && a.slug !== article.slug
  );

  return (
    <main className="container-x pb-16">
      <InnerHero>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Help Center", href: "/help" },
            { name: article.q },
          ]}
        />
        <div className="text-xs font-semibold uppercase text-brand-blue">{article.category.title}</div>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl">{article.q}</h1>
      </InnerHero>

      <article className="mx-auto mt-8 max-w-3xl">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft md:p-8">
          <p className="leading-relaxed text-ink-700">{article.a}</p>
        </div>
        <Link
          href="/help"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
        >
          <ArrowLeft size={15} /> Back to Help Center
        </Link>
      </article>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">Related questions</h2>
          <ul className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/help/${r.slug}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-ink-800 transition-colors hover:text-brand-blue"
                >
                  <span>{r.q}</span>
                  <ArrowRight size={15} className="shrink-0 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-brand-navy p-10 text-center text-white">
        <LifeBuoy size={28} className="mx-auto text-brand-gold" />
        <h2 className="mt-4 font-display text-2xl tracking-[0.02em]">Still need help?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Our support team usually replies within one working day.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
        >
          Contact support <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  );
}
