import type { Metadata } from "next";
import { buildMetadata, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { InnerHero } from "@/components/layout/InnerHero";
import { RelatedContent } from "@/components/RelatedContent";
import { apiFetchSSR } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, BookOpen, FileText } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

// Subject detail - fetched from the API like programmes/tutors, so every
// catalogue subject has a real page (the old version was a hardcoded
// 3-subject stub that 404'd the other ~57 subjects).
type SubjectDTO = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string | null;
  is_active: boolean;
};

async function fetchSubject(slug: string): Promise<SubjectDTO | null> {
  try {
    const res = await apiFetchSSR<SubjectDTO>(`/subjects/${slug}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const s = await fetchSubject(params.slug);
  if (!s) {
    return buildMetadata({
      title: "Subject Not Found",
      description: "Subject not found",
      path: `/subjects/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${s.name} Tutoring - ${s.category} | YK-Virtual`,
    description:
      s.description ??
      `${s.name} tutoring with vetted YK-Virtual tutors - private tuition, small-group cohorts and exam preparation (${s.category}).`,
    path: `/subjects/${params.slug}`,
  });
}

export default async function SubjectPage(props: Props) {
  const params = await props.params;
  const subject = await fetchSubject(params.slug);
  if (!subject) return notFound();

  const desc =
    subject.description ??
    `${subject.name} tutoring with vetted YK-Virtual tutors - one-to-one private tuition and small-group cohorts, with progress reports for parents and escrow-protected payments.`;

  const course = courseJsonLd({
    name: `${subject.name} Tutoring`,
    description: desc,
    provider: "YK-Virtual",
    url: `https://virtual.ykaycollege.com/subjects/${subject.slug}`,
  });
  const faqs = faqJsonLd([
    {
      question: `How do I start ${subject.name} lessons?`,
      answer:
        "Browse tutors for this subject, request private tuition, or join a small-group cohort - your payment stays in escrow until lessons are delivered.",
    },
    {
      question: "How are YK-Virtual tutors verified?",
      answer:
        "Every tutor passes identity and document verification, a competency assessment in their subject, an interview and background checks before they can teach.",
    },
  ]);

  return (
    <main className="container-x py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqs) }}
      />

      <InnerHero variant="centered">
        <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0F2A1A]">
          {subject.category}
        </span>
        <h1 className="mt-3 font-display text-4xl tracking-[0.02em] text-[#0F2A1A] md:text-5xl">
          {subject.name}
        </h1>
        <p className="mt-4 max-w-3xl leading-relaxed text-[#0F2A1A]/70">{desc}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/tutors?subject=${subject.slug}`}
            className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030] hover:-translate-y-0.5"
          >
            <Users size={15} /> Find a tutor
          </Link>
          <Link
            href={`/cohorts`}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 px-6 py-3 text-sm font-bold text-[#0F2A1A]/85 transition hover:border-[#0F2A1A] hover:bg-[#0F2A1A] hover:text-white"
          >
            <BookOpen size={15} /> Browse cohorts
          </Link>
        </div>
      </InnerHero>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
          <Users size={20} className="text-[#0F2A1A]" />
          <h2 className="mt-3 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
            Private tuition
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/70">
            1-to-1 online or in person, adaptive learning plan, escrow-protected
            payment.
          </p>
          <Link
            href={`/private-tuition?subject=${subject.slug}`}
            className="mt-4 inline-block text-sm font-bold text-[#0F2A1A] hover:underline"
          >
            Book tuition →
          </Link>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
          <BookOpen size={20} className="text-[#0F2A1A]" />
          <h2 className="mt-3 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
            Small-group cohorts
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/70">
            Live classes with a vetted tutor, recordings and weekly progress
            reports.
          </p>
          <Link
            href={`/cohorts`}
            className="mt-4 inline-block text-sm font-bold text-[#0F2A1A] hover:underline"
          >
            View cohorts →
          </Link>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
          <FileText size={20} className="text-[#0F2A1A]" />
          <h2 className="mt-3 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
            Guides &amp; resources
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/70">
            Exam strategy, study guides and subject advice from our tutors.
          </p>
          <Link
            href={`/blog`}
            className="mt-4 inline-block text-sm font-bold text-[#0F2A1A] hover:underline"
          >
            Read guides →
          </Link>
        </div>
      </div>

      <RelatedContent subjectSlug={subject.slug} />
    </main>
  );
}

export const revalidate = 600;
