import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { CategoryRail } from "@/components/layout/CategoryRail";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Exam Preparation — WAEC, NECO, JAMB, IGCSE & A-Level | NUVORA",
  description:
    "Structured exam preparation: WAEC, NECO, JAMB/UTME, IGCSE and A-Level revision cohorts, past-paper practice, mocks and private support from vetted tutors.",
  path: "/exam-prep",
});

const EXAMS = [
  { code: "IGCSE", name: "Cambridge & Pearson IGCSE", desc: "Year 10–11 revision cohorts with past-paper practice and mocks.", href: "/programmes" },
  { code: "WAEC", name: "West African Examinations Council", desc: "Core and elective subjects, aligned lesson plans and practice.", href: "/programmes" },
  { code: "NECO", name: "National Examinations Council", desc: "Shared-syllabus preparation alongside WAEC where applicable.", href: "/programmes" },
  { code: "JAMB", name: "UTME / Post-UTME", desc: "Topic-focused revision, question analysis and CBT mock tests.", href: "/programmes" },
  { code: "A-Level", name: "Advanced Level", desc: "Subject-specialist tuition for university-bound learners.", href: "/programmes" },
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
          <div key={e.code} className="border rounded-2xl p-6 hover:shadow-lift transition-shadow">
            <div className="text-3xl font-extrabold text-brand-blue">{e.code}</div>
            <h2 className="font-bold mt-2">{e.name}</h2>
            <p className="mt-2 text-sm text-ink-600">{e.desc}</p>
            <Link href={e.href} className="mt-4 inline-block text-sm font-semibold text-brand-blue hover:underline">
              Explore →
            </Link>
          </div>
        ))}
        <div className="rounded-2xl bg-brand-blue text-white p-6 flex flex-col justify-between">
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
