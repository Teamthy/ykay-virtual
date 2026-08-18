import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CategoryRail } from "@/components/layout/CategoryRail";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import { EXAM_MATRIX } from "@/lib/exam-prep-data";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Exam Preparation — WAEC, NECO, JAMB, IGCSE & A-Level | NUVORA",
  description:
    "Structured exam preparation: WAEC, NECO, JAMB/UTME, IGCSE and A-Level revision cohorts, past-paper practice, mocks and private support from vetted tutors.",
  path: "/exam-prep",
});

const EXAMS = [
  { code: "IGCSE", name: "Cambridge & Pearson IGCSE", desc: "Year 10–11 revision cohorts with past-paper practice and mocks.", href: "/curricula/british", photo: "/hero/british.jpg" },
  { code: "WAEC", name: "West African Examinations Council", desc: "Core and elective subjects, aligned lesson plans and practice.", href: "/curricula/nigerian", photo: "/hero/nigerian.jpg" },
  { code: "NECO", name: "National Examinations Council", desc: "Shared-syllabus preparation alongside WAEC where applicable.", href: "/curricula/nigerian", photo: "/hero/exam-prep.jpg" },
  { code: "JAMB", name: "UTME / Post-UTME", desc: "Topic-focused revision, question analysis and CBT mock tests.", href: "/utme-2026", photo: "/hero/utme.jpg" },
  { code: "A-Level", name: "Advanced Level", desc: "Subject-specialist tuition for university-bound learners.", href: "/curricula/british", photo: "/hero/programmes.jpg" },
];

const METHOD = [
  { step: "1", title: "Diagnostic assessment", body: "We test where the learner stands against the exam syllabus before building the plan." },
  { step: "2", title: "Structured revision", body: "Weekly sessions focused on high-yield topics, with past questions mapped to each topic." },
  { step: "3", title: "Mock examinations", body: "Timed mocks under exam conditions, marked with feedback and a predicted-grade view." },
  { step: "4", title: "Parent reports", body: "Weekly progress reports so parents see improvement areas in real time." },
];

export default function ExamPrepPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Exam Preparation", item: "https://nuvora.com/exam-prep" },
  ]);
  const course = courseJsonLd({
    name: "Exam Preparation at NUVORA",
    description: "WAEC, NECO, JAMB, IGCSE and A-Level preparation: revision cohorts, mocks and private support.",
    provider: "NUVORA",
    url: "https://nuvora.com/exam-prep",
  });

  return (
    <main className="container-x py-10">
      <PageHero
        cover="/hero/exam-prep.jpg"
        eyebrow="Exam season, handled"
        title="Examination Preparation"
        subtitle="Revision cohorts, past-paper practice and mock examinations — built for WAEC, NECO, JAMB, IGCSE and A-Level candidates."
        crumbs={[{ name: "Home", href: "/" }, { name: "Exam Preparation" }]}
        align="center"
      >
        <Link href="/programmes" className="btn-primary">Join a revision cohort</Link>
          <Link href="/private-tuition" className="btn-gold">Get private support</Link>
      </PageHero>

      <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        <aside className="lg:sticky lg:top-28">
          <CategoryRail />
        </aside>
        <div>
      <section className="mt-2 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {EXAMS.map((e) => (
          <Link
            key={e.code}
            href={e.href}
            className="flex min-h-[240px] flex-col justify-end overflow-hidden rounded-2xl bg-cover bg-center p-6 text-white shadow-card"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.25), rgba(6,15,38,0.88)), url(${e.photo})`,
            }}
          >
            <div className="font-display text-3xl tracking-[0.02em]">{e.code}</div>
            <h2 className="mt-1 font-bold">{e.name}</h2>
            <p className="mt-2 text-sm text-white/80">{e.desc}</p>
            <span className="mt-4 text-sm font-semibold text-brand-gold">Explore →</span>
          </Link>
        ))}
        <div className="flex min-h-[240px] flex-col justify-between rounded-2xl bg-cover bg-center p-6 text-white" style={{ backgroundImage: "linear-gradient(165deg, rgba(1,57,32,0.88), rgba(6,15,38,0.75)), url(/hero/checkout.jpg)" }}>
          <div>
            <h2 className="font-bold text-lg">Not sure where to start?</h2>
            <p className="mt-2 text-sm text-white/80">
              Tell us the exam and target date — we&apos;ll design the revision plan.
            </p>
          </div>
          <Link href="/private-tuition" className="mt-4 inline-flex items-center justify-center rounded-xl bg-white text-brand-blue font-bold text-sm px-5 py-3">
            Request a plan
          </Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">Our revision method</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {METHOD.map((m) => (
            <div key={m.step} className="border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white font-extrabold">{m.step}</div>
              <h3 className="font-bold mt-3">{m.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-2">Browse by exam &amp; subject</h2>
        <p className="text-sm text-ink-600 mb-6">Pick your exam, then a subject, to see the paper structure and what the subject covers.</p>
        <div className="space-y-6">
          {EXAM_MATRIX.map((exam) => (
            <div key={exam.slug} className="border rounded-2xl p-6">
              <div className="flex items-baseline gap-3">
                <span className="text-lg font-extrabold text-brand-blue">{exam.code}</span>
                <span className="text-sm text-ink-500">{exam.name}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {exam.subjects.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/exam-prep/${exam.slug}/${s.slug}`}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-gold hover:text-brand-blue"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

          <CohortStrip />
        </div>
      </div>
          <StepsToTutor
        title="Get exam-ready in 3 simple steps"
        steps={[
          { n: "1", title: "Pick your exam", desc: "Choose WAEC, NECO, JAMB, IGCSE, A-Level or an entrance exam — we cover every major syllabus." },
          { n: "2", title: "Join your revision cohort", desc: "Match with a vetted subject specialist and a small-group cohort that fits your schedule." },
          { n: "3", title: "Pass with past papers", desc: "Work through past-paper practice, mocks and weekly progress checks until exam day." },
        ]}
      />
      <SuccessChampions />
      <GuaranteeBand />
    </main>
  );
}
