import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CardCarousel } from "@/components/layout/CardCarousel";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import { BookOpen, FileText, LineChart, PlayCircle } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "British Curriculum Online - Year 7-9, IGCSE & A-Level | NUVORA",
  description:
    "British curriculum learning online: Year 7, 8 and 9, IGCSE (Year 10-11) and A-Level - cohorts, private tuition and exam preparation with vetted tutors.",
  path: "/curricula/british",
});

const STAGES = [
  { title: "Year 7-9", desc: "Build strong foundations across English, Maths, Sciences and Computing.", subjects: ["Mathematics", "English", "Science", "Computing"], photo: "/hero/subjects.jpg" },
  { title: "IGCSE · Year 10-11", desc: "Structured subject cohorts with past-paper practice and coursework support.", subjects: ["Computer Science", "Mathematics", "Physics", "English"], photo: "/hero/british.jpg" },
  { title: "A-Level · Year 12-13", desc: "Subject-specialist teaching for university-bound learners.", subjects: ["Computer Science", "Mathematics", "Further Maths", "Physics"], photo: "/hero/programmes.jpg" },
];

const HOW = [
  { icon: <FileText size={18} />, t: "Termly assessments", d: "Aligned to the British curriculum at every stage." },
  { icon: <PlayCircle size={18} />, t: "Past-paper mocks", d: "IGCSE and A-Level practice with full mock exams." },
  { icon: <LineChart size={18} />, t: "Weekly parent reports", d: "Clear visibility into progress every week." },
  { icon: <BookOpen size={18} />, t: "Recorded lessons", d: "Resources and replays after every session." },
];

const FAQS = [
  { question: "Which exam boards do you support?", answer: "We prepare learners for Cambridge and Pearson IGCSE and A-Level specifications. Contact us for your specific syllabus." },
  { question: "Can my child join mid-year?", answer: "Yes - we assess the learner's level and place them in the right cohort or a tailored private programme." },
  { question: "Do you offer IGCSE exam preparation?", answer: "Yes. IGCSE cohorts include revision sessions, past-paper practice and mock examinations." },
];

export default function BritishCurriculumPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "British Curriculum", item: "https://nuvora.com/curricula/british" },
  ]);
  const course = courseJsonLd({
    name: "British Curriculum Online",
    description: "Year 7-9, IGCSE and A-Level learning with vetted tutors, structured cohorts and exam preparation.",
    provider: "NUVORA",
    url: "https://nuvora.com/curricula/british",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <PageHero
        cover="/hero/british.jpg"
        eyebrow="British pathway"
        title="British Curriculum Online"
        subtitle="From Key Stage 3 foundations to IGCSE and A-Level - a structured British pathway taught by vetted subject specialists, with parent visibility at every step."
        crumbs={[{ name: "Home", href: "/" }, { name: "Curricula" }, { name: "British Curriculum" }]}
        align="center"
      >
        <Link href="/programmes" className="btn-primary">Browse programmes</Link>
        <Link href="/private-tuition" className="btn-gold">Book private tuition</Link>
      </PageHero>

      <div className="container-x pb-16">
        {/* Stage carousel */}
        <section className="mt-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">Learning stages</h2>
          </div>
          <CardCarousel>
            {STAGES.map((s) => (
              <div
                key={s.title}
                data-card
                className="flex min-h-[280px] w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-cover bg-center p-6 text-white shadow-card"
                style={{ backgroundImage: `linear-gradient(165deg, rgba(6,15,38,0.78), rgba(1,57,32,0.62)), url(${s.photo})` }}
              >
                <h2 className="text-xl font-extrabold">{s.title}</h2>
                <p className="mt-2 text-sm text-white/85">{s.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.subjects.map((sub) => (
                    <span key={sub} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">{sub}</span>
                  ))}
                </div>
                <Link href="/tutors" className="mt-auto pt-5 inline-block text-sm font-semibold text-brand-gold">Find a tutor →</Link>
              </div>
            ))}
          </CardCarousel>
        </section>

        {/* How assessment works */}
        <section className="mt-14 grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold">How assessment &amp; exam support works</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {HOW.map((h) => (
                <div key={h.t} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-light text-deep">{h.icon}</span>
                  <p className="mt-3 font-bold text-ink-900">{h.t}</p>
                  <p className="mt-1 text-sm text-ink-500">{h.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-ink-50 border border-ink-100 p-6">
            <h3 className="font-bold">Featured next steps</h3>
            <div className="mt-4 space-y-3">
              <Link href="/programmes" className="block border rounded-xl bg-white p-4 hover:border-brand-blue transition-colors">
                <span className="font-semibold text-sm">IGCSE Computer Science</span>
                <span className="block text-xs text-ink-500 mt-0.5">Year 10-11 · cohort + private</span>
              </Link>
              <Link href="/programmes" className="block border rounded-xl bg-white p-4 hover:border-brand-blue transition-colors">
                <span className="font-semibold text-sm">IGCSE Mathematics</span>
                <span className="block text-xs text-ink-500 mt-0.5">Year 10-11 · cohort + private</span>
              </Link>
              <Link href="/private-tuition" className="block border rounded-xl bg-white p-4 hover:border-brand-blue transition-colors">
                <span className="font-semibold text-sm">A-Level subject tuition</span>
                <span className="block text-xs text-ink-500 mt-0.5">Request a specialist tutor</span>
              </Link>
            </div>
          </div>
        </section>

        <CohortStrip />

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold mb-6">Frequently asked questions</h2>
          <div className="max-w-2xl space-y-3">
            {FAQS.map((f) => (
              <details key={f.question} className="border rounded-xl px-5 py-4">
                <summary className="font-semibold cursor-pointer">{f.question}</summary>
                <p className="mt-2 text-sm text-ink-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
