import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { apiFetchSSR } from "@/lib/api";
import Link from "next/link";
import { ProgrammeDetailTabs } from "@/features/programmes/components/ProgrammeDetailTabs";

export const revalidate = 300;

type Props = { params: { slug: string } };

type ProgrammeDetail = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  description?: string;
  format: string;
  curriculum_name?: string;
  level_name?: string;
  exam_name?: string;
  subjects?: string[];
  price_min?: number;
  price_max?: number;
  currency: string;
  is_featured: boolean;
  next_start?: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let p: ProgrammeDetail | null = null;
  try {
    const res = await apiFetchSSR<ProgrammeDetail>(`/programmes/${params.slug}`);
    p = res.data;
  } catch {
    p = null;
  }
  if (!p) {
    return buildMetadata({ title: "Programme Not Found", description: "Programme not found", path: `/programmes/${params.slug}`, noIndex: true });
  }
  return buildMetadata({
    title: p.title,
    description: p.summary ?? `${p.title} — ${[p.curriculum_name, p.level_name, p.exam_name].filter(Boolean).join(" · ")} at YKAY Virtual School.`,
    path: `/programmes/${params.slug}`,
  });
}

// Reusable programme detail template (working-doc §8.3): breadcrumb, title
// with curriculum/level/subject, ENROL/BOOK CTAs, tabs (Overview | Topics |
// Cohorts | Private Tuition | Tutors | FAQ).
export default async function ProgrammeDetailPage({ params }: Props) {
  let p: ProgrammeDetail | null = null;
  try {
    const res = await apiFetchSSR<ProgrammeDetail>(`/programmes/${params.slug}`);
    p = res.data;
  } catch {
    p = null;
  }
  if (!p) return notFound();

  const course = courseJsonLd({
    name: p.title,
    description: p.summary ?? p.title,
    provider: "YKAY Virtual School",
    url: `https://ykayvirtual.com/programmes/${p.slug}`,
  });
  const faq = faqJsonLd([
    { question: "Who is this programme for?", answer: `${p.title} is designed for learners at the ${p.level_name ?? "appropriate"} level${p.exam_name ? ` preparing for ${p.exam_name}` : ""}.` },
    { question: "How do I join?", answer: "Choose a cohort from the Cohorts tab and enrol securely — your fee is held in escrow until lessons are delivered. Private tuition is also available." },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Programmes", href: "/programmes" }, { name: p.title }]} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide">
            {[p.curriculum_name, p.level_name, p.exam_name, p.format.replace(/_/g, " ")].filter(Boolean).map((tag) => (
              <span key={tag} className="bg-brand-blue/10 text-brand-blue px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3">{p.title}</h1>
          {p.summary && <p className="mt-3 text-ink-600 leading-relaxed">{p.summary}</p>}
          {(p.subjects?.length ?? 0) > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.subjects!.map((s) => (
                <span key={s} className="text-xs bg-ink-50 text-ink-600 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
        {/* CTAs */}
        <div className="border rounded-2xl p-5 w-full sm:w-64 space-y-3">
          {p.next_start && (
            <p className="text-xs text-ink-500">Next cohort starts <span className="font-semibold text-ink-700">{new Date(p.next_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></p>
          )}
          <p className="text-xl font-extrabold text-brand-blue">
            {p.price_min != null ? `${p.currency} ${p.price_min.toLocaleString()}${p.price_max && p.price_max !== p.price_min ? `–${p.price_max.toLocaleString()}` : ""}` : "Price on request"}
          </p>
          <a href={`/cohorts?programme_id=${p.id}`} className="btn-primary w-full inline-flex items-center justify-center text-sm">Find a cohort</a>
          <Link href="/private-tuition" className="btn-gold w-full inline-flex items-center justify-center text-sm">Book private tuition</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <ProgrammeDetailTabs programme={p} />
      </div>
    </main>
  );
}
