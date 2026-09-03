import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Target,
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { InnerHero } from "@/components/layout/InnerHero";
import { buildMetadata } from "@/lib/seo";
import {
  getExam,
  getExamPrepPages,
  getSubject,
  type ExamSubject,
} from "@/lib/exam-prep-data";

// Exam-prep subject pages — one indexable URL per exam × subject (from
// lib/exam-prep-data.ts). Factual paper structure + board-agnostic syllabus
// themes, with links back to the live subject catalogue.

type Props = { params: Promise<{ exam: string; subject: string }> };

export function generateStaticParams() {
  return getExamPrepPages();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { exam, subject } = await props.params;
  const examInfo = getExam(exam);
  const subjectInfo = getSubject(subject);
  if (!examInfo || !subjectInfo) {
    return buildMetadata({
      title: "Not found | YK-Virtual",
      description: "This exam subject page could not be found.",
      path: `/exam-prep/${exam}/${subject}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${subjectInfo.name} ${examInfo.code} Preparation | YK-Virtual`,
    description: `${examInfo.name}: ${subjectInfo.overview}`,
    path: `/exam-prep/${examInfo.slug}/${subjectInfo.slug}`,
  });
}

export default async function ExamPrepSubjectPage(props: Props) {
  const { exam: examSlug, subject: subjectSlug } = await props.params;
  const exam = getExam(examSlug);
  const subject = getSubject(subjectSlug);
  if (!exam || !subject || !exam.subjects.includes(subject.slug))
    return notFound();

  const related = exam.subjects
    .filter((s) => s !== subject.slug)
    .map((s) => getSubject(s))
    .filter((s): s is ExamSubject => Boolean(s));

  return (
    <main className="container-x pb-16">
      <InnerHero
        variant="imageLeft"
        image={{
          src: "/hero/exam-prep.jpg",
          alt: `${subject.name} — ${exam.code} exam preparation`,
        }}
      >
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Exam Preparation", href: "/exam-prep" },
            { name: `${subject.name} — ${exam.code}` },
          ]}
        />
        <div className="text-xs font-semibold uppercase text-brand-blue">
          {exam.name}
        </div>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight md:text-4xl">
          {subject.name} — {exam.code} Preparation
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-600">{exam.fullName}</p>
      </InnerHero>

      <div className="mx-auto mt-8 grid max-w-5xl items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-6">
          {/* Paper structure */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <BookOpen size={18} className="text-brand-green" /> About this
              paper
            </h2>
            <p className="mt-2 text-sm text-ink-500">
              {exam.level} · {exam.format}
            </p>
            <ul className="mt-4 space-y-3">
              {exam.structure.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">
              {exam.grading}
            </p>
          </section>

          {/* What the subject covers */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <BookOpen size={18} className="text-brand-green" /> What{" "}
              {subject.name} covers
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              {subject.overview}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {subject.topics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-start gap-2 rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green" />
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {/* Skills */}
          <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-brand-navy">
              <Target size={18} className="text-brand-green" /> Skills the paper
              rewards
            </h2>
            <ul className="mt-4 space-y-3">
              {subject.skills.map((skill) => (
                <li key={skill} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">
                    {skill}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* How YK-Virtual prepares you */}
          <section className="rounded-2xl bg-brand-navy p-6 text-white">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-white">
              <GraduationCap size={18} className="text-brand-gold" /> How
              YK-Virtual prepares you
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/85">
              <li>· Vetted subject specialists matched to your syllabus</li>
              <li>· Past-paper practice mapped to each topic</li>
              <li>· Timed mocks with feedback and a predicted-grade view</li>
              <li>· Weekly progress reports for parents</li>
            </ul>
            <div className="mt-5 space-y-2.5">
              <Link
                href="/programmes"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-gold px-5 py-3 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover"
              >
                Join a revision cohort <ArrowRight size={15} />
              </Link>
              <Link
                href={`/subjects/${subject.catalogueSlug}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Explore {subject.name} tutors
              </Link>
            </div>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-12 max-w-5xl">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
            Other {exam.code} subjects
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/exam-prep/${exam.slug}/${r.slug}`}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-gold hover:text-brand-blue"
              >
                {r.name}
              </Link>
            ))}
          </div>
          <Link
            href="/exam-prep"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
          >
            <ArrowRight size={15} /> Back to Exam Preparation
          </Link>
        </section>
      )}
    </main>
  );
}
