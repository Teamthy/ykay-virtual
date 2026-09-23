import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { ExamSubjectBrowser } from "./ExamSubjectBrowser";

export const metadata: Metadata = buildMetadata({
  title: "Exam Preparation - WAEC, NECO, JAMB, IGCSE & A-Level | YK-Virtual",
  description:
    "Structured exam preparation: WAEC, NECO, JAMB/UTME, IGCSE and A-Level revision cohorts, past-paper practice, mocks and private support from vetted tutors.",
  path: "/exam-prep",
});

const EXAMS = [
  {
    code: "IGCSE",
    name: "Cambridge & Pearson IGCSE",
    desc: "Year 10–11 revision with past-paper practice and mocks.",
    href: "/curricula/british",
    photo: "/hero/british.jpg",
  },
  {
    code: "WAEC",
    name: "West African Examinations Council",
    desc: "Core and elective subjects, with lesson plans aligned to the syllabus.",
    href: "/curricula/nigerian",
    photo: "/hero/nigerian.jpg",
  },
  {
    code: "NECO",
    name: "National Examinations Council",
    desc: "Shared-syllabus preparation alongside WAEC where the papers overlap.",
    href: "/curricula/nigerian",
    photo: "/hero/exam-prep.jpg",
  },
  {
    code: "JAMB",
    name: "UTME / Post-UTME",
    desc: "Topic revision, question analysis and computer-based mock sittings.",
    href: "/utme-2026",
    photo: "/hero/utme.jpg",
  },
  {
    code: "A-Level",
    name: "Advanced Level",
    desc: "Subject-specialist tuition for learners heading to university.",
    href: "/curricula/british",
    photo: "/hero/programmes.jpg",
  },
  {
    code: "SAT",
    name: "Digital SAT",
    desc: "Reading & Writing and Math, with timed section practice.",
    href: "/sat",
    photo: "/hero/test-prep.jpg",
  },
];

const METHOD = [
  {
    step: "01",
    title: "Diagnostic",
    body: "A timed paper shows where the learner stands against the published syllabus before a plan is built.",
  },
  {
    step: "02",
    title: "Revision",
    body: "Weekly sessions stay on the topics the syllabus actually examines, with past questions mapped to each one.",
  },
  {
    step: "03",
    title: "Mocks",
    body: "Timed sittings under exam conditions, marked with feedback. We do not publish a predicted grade.",
  },
  {
    step: "04",
    title: "Reports",
    body: "Parents see what was covered and what to revise next. Progress is described, not scored as a promise.",
  },
];

export default function ExamPrepPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "Exam Preparation", item: "https://virtual.ykaycollege.com/exam-prep" },
  ]);
  const course = courseJsonLd({
    name: "Exam Preparation at YK-Virtual",
    description: "WAEC, NECO, JAMB, IGCSE and A-Level preparation: revision cohorts, mocks and private support.",
    provider: "YK-Virtual",
    url: "https://virtual.ykaycollege.com/exam-prep",
  });

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      <PageHero
        cover="/home/card-exam.jpg"
        eyebrow="Exam season, handled"
        title="Examination Preparation"
        subtitle="Revision cohorts, past-paper practice and marked mocks for WAEC, NECO, JAMB, IGCSE and A-Level. Feedback on the paper you sat — not a predicted score."
        crumbs={[{ name: "Home", href: "/" }, { name: "Exam Preparation" }]}
        align="center"
        ctas={[
          { label: "Browse subjects", href: "#subjects", primary: true },
          { label: "Open CBT practice", href: "/cbt" },
        ]}
      />

      <section className="w-full bg-white py-14 lg:py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/55">Boards we prepare</p>
              <h2 className="mt-3 font-display text-[clamp(2rem,4vw,3.4rem)] uppercase leading-[0.95] text-[#0F2A1A]">
                One page per exam
              </h2>
            </div>
            <p className="max-w-[36ch] text-[13px] leading-relaxed text-[#0F2A1A]/65">
              Choose the board. The subject pages describe structure and topics — they do not invent cut-offs.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMS.map((e) => (
              <Link
                key={e.code}
                href={e.href}
                className="group flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[20px] bg-[#0F2A1A] p-6 text-white shadow-[0_12px_40px_rgba(15,42,26,0.12)]"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(15,42,26,0.15), rgba(15,42,26,0.88)), url(${e.photo})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <p className="font-display text-[40px] leading-none tracking-[0.02em]">{e.code}</p>
                <h3 className="mt-2 text-[15px] font-bold">{e.name}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/80">{e.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#D6FF57]">
                  Explore <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#0F2A1A] py-14 text-white lg:py-20">
        <div className="container-x">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D6FF57]">How revision is run</p>
          <h2 className="mt-3 max-w-[16ch] font-display text-[clamp(2rem,4vw,3.4rem)] uppercase leading-[0.95]">
            Four steps. No score promise.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METHOD.map((m, i) => (
              <article
                key={m.step}
                className={
                  i === 2
                    ? "flex min-h-[240px] flex-col rounded-[20px] bg-[#D6FF57] p-6 text-[#0F2A1A]"
                    : "flex min-h-[240px] flex-col rounded-[20px] border border-white/10 bg-white/5 p-6"
                }
              >
                <span className={i === 2 ? "text-[12px] font-extrabold" : "text-[12px] font-extrabold text-[#D6FF57]"}>
                  {m.step}
                </span>
                <h3 className="mt-4 font-display text-[26px] uppercase leading-none">{m.title}</h3>
                <p className={i === 2 ? "mt-3 text-[13px] leading-relaxed text-[#0F2A1A]/80" : "mt-3 text-[13px] leading-relaxed text-white/75"}>
                  {m.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div id="subjects">
        <ExamSubjectBrowser />
      </div>

      <section className="w-full bg-[#D6FF57] py-14 lg:py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-[40rem]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/60">Not sure where to start</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,3.5vw,3rem)] uppercase leading-[0.95] text-[#0F2A1A]">
              Tell us the exam and the date.
            </h2>
            <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-[#0F2A1A]/75">
              An advisor can sketch a revision plan from the syllabus and your timetable. The price is agreed before any payment, and the fee sits in escrow until lessons are delivered.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/private-tuition" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-black">
              Request a plan <ArrowRight size={14} />
            </Link>
            <Link href="/cbt" className="inline-flex items-center gap-2 rounded-full border border-[#0F2A1A]/20 bg-white px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#F9F6ED]">
              Try a CBT paper
            </Link>
          </div>
        </div>
      </section>

      <StepsToTutor
        title="Get exam-ready in 3 simple steps"
        steps={[
          {
            n: "1",
            title: "Pick your exam",
            desc: "WAEC, NECO, JAMB, IGCSE, A-Level or an entrance exam — each has its own published structure.",
          },
          {
            n: "2",
            title: "Join a revision cohort",
            desc: "Match with a vetted subject specialist and a small group that fits the timetable, or request 1-to-1.",
          },
          {
            n: "3",
            title: "Revise with past papers",
            desc: "Work through past papers and marked mocks until exam day. Feedback, not a guaranteed result.",
          },
        ]}
      />
      <SuccessChampions />
    </main>
  );
}
