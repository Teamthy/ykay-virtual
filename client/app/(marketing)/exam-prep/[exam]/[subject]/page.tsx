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
        <div className="text-xs font-semibold uppercase text-[#0F2A1A]">
          {exam.name}
        </div>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight md:text-4xl">
          {subject.name} — {exam.code} Preparation
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[#0F2A1A]/70">{exam.fullName}</p>
      </InnerHero>

      <div className="mx-auto mt-8 grid max-w-5xl items-start gap-6 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-6">
          {/* Paper structure */}
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
              <BookOpen size={18} className="text-[#0F2A1A]" /> About this
              paper
            </h2>
            <p className="mt-2 text-sm text-[#0F2A1A]/65">
              {exam.level} · {exam.format}
            </p>
            <ul className="mt-4 space-y-3">
              {exam.structure.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#F9F6ED] text-[#0F2A1A]">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-[#0F2A1A]/75">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-[#F9F6ED] p-4 text-sm leading-relaxed text-[#0F2A1A]/75">
              {exam.grading}
            </p>
          </section>

          {/* What the subject covers */}
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
              <BookOpen size={18} className="text-[#0F2A1A]" /> What{" "}
              {subject.name} covers
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/75">
              {subject.overview}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {subject.topics.map((topic) => (
                <li
                  key={topic}
                  className="flex items-start gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm text-[#0F2A1A]/75"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#D6FF57]" />
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {/* Skills */}
          <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-[#0F2A1A]">
              <Target size={18} className="text-[#0F2A1A]" /> Skills the paper
              rewards
            </h2>
            <ul className="mt-4 space-y-3">
              {subject.skills.map((skill) => (
                <li key={skill} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#F9F6ED] text-[#0F2A1A]">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-[#0F2A1A]/75">
                    {skill}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* How YK-Virtual prepares you */}
          <section className="rounded-2xl bg-[#0F2A1A] p-6 text-white">
            <h2 className="flex items-center gap-2 font-display text-lg tracking-[0.02em] text-white">
              <GraduationCap size={18} className="text-[#D6FF57]" /> How
              YK-Virtual prepares you
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/85">
              <li>· Vetted subject specialists matched to your syllabus</li>
              <li>· Past-paper practice mapped to each topic</li>
              <li>· Timed mocks marked with feedback — not a predicted grade</li>
              <li>· Progress notes after sessions, for parents</li>
            </ul>
            <div className="mt-5 space-y-2.5">
              <Link
                href="/programmes"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#D6FF57] px-5 py-3 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]"
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
          <h2 className="font-display text-xl tracking-[0.02em] text-[#0F2A1A]">
            Other {exam.code} subjects
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/exam-prep/${exam.slug}/${r.slug}`}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-[#0F2A1A]/75 transition-colors hover:border-[#D6FF57] hover:text-[#0F2A1A]"
              >
                {r.name}
              </Link>
            ))}
          </div>
          <Link
            href="/exam-prep"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0F2A1A] hover:underline"
          >
            <ArrowRight size={15} /> Back to Exam Preparation
          </Link>
        </section>
      )}
    </main>
  );
}
