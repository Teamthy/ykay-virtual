import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "British Curriculum Online — Year 7–9, IGCSE & A-Level | YKAY",
  description:
    "British curriculum learning online: Year 7, 8 and 9, IGCSE (Year 10–11) and A-Level — cohorts, private tuition and exam preparation with vetted tutors.",
  path: "/curricula/british",
});

const STAGES = [
  { title: "Year 7–9", desc: "Build strong foundations across English, Maths, Sciences and Computing.", subjects: ["Mathematics", "English", "Science", "Computing"] },
  { title: "IGCSE · Year 10–11", desc: "Structured subject cohorts with past-paper practice and coursework support.", subjects: ["Computer Science", "Mathematics", "Physics", "English"] },
  { title: "A-Level · Year 12–13", desc: "Subject-specialist teaching for university-bound learners.", subjects: ["Computer Science", "Mathematics", "Further Maths", "Physics"] },
];

const FAQS = [
  { question: "Which exam boards do you support?", answer: "We prepare learners for Cambridge and Pearson IGCSE and A-Level specifications. Contact us for your specific syllabus." },
  { question: "Can my child join mid-year?", answer: "Yes — we assess the learner's level and place them in the right cohort or a tailored private programme." },
  { question: "Do you offer IGCSE exam preparation?", answer: "Yes. IGCSE cohorts include revision sessions, past-paper practice and mock examinations." },
];

export default function BritishCurriculumPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "British Curriculum", item: "https://ykayvirtual.com/curricula/british" },
  ]);
  const course = courseJsonLd({
    name: "British Curriculum Online",
    description: "Year 7–9, IGCSE and A-Level learning with vetted tutors, structured cohorts and exam preparation.",
    provider: "YKAY Virtual School",
    url: "https://ykayvirtual.com/curricula/british",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Curricula" }, { name: "British Curriculum" }]} />

      <section className="text-center max-w-3xl mx-auto">
        <p className="tag-handwritten">British pathway</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mt-2">British Curriculum Online</h1>
        <p className="mt-4 text-ink-600">
          From Key Stage 3 foundations to IGCSE and A-Level — a structured British pathway taught by
          vetted subject specialists, with parent visibility at every step.
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/programmes" className="btn-primary">Browse programmes</Link>
          <Link href="/private-tuition" className="btn-gold">Book private tuition</Link>
        </div>
      </section>

      <section className="mt-14 grid md:grid-cols-3 gap-5">
        {STAGES.map((s) => (
          <div key={s.title} className="border rounded-2xl p-6 hover:shadow-lift transition-shadow">
            <h2 className="text-xl font-extrabold">{s.title}</h2>
            <p className="mt-2 text-sm text-ink-600">{s.desc}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {s.subjects.map((sub) => (
                <span key={sub} className="text-xs bg-brand-blue-light text-brand-blue px-2.5 py-1 rounded-full font-semibold">
                  {sub}
                </span>
              ))}
            </div>
            <Link href="/tutors" className="mt-5 inline-block text-sm font-semibold text-brand-blue hover:underline">
              Find a tutor →
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-14 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-extrabold">How assessment & exam support works</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-700">
            {[
              "Termly progress assessments aligned to the British curriculum",
              "Past-paper practice and mock examinations for IGCSE and A-Level",
              "Weekly progress reports for parents",
              "Recorded lessons and resources after every session",
            ].map((t) => (
              <li key={t} className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-ink-50 border border-ink-100 p-6">
          <h3 className="font-bold">Featured next steps</h3>
          <div className="mt-4 space-y-3">
            <Link href="/programmes" className="block border rounded-xl bg-white p-4 hover:border-brand-blue transition-colors">
              <span className="font-semibold text-sm">IGCSE Computer Science</span>
              <span className="block text-xs text-ink-500 mt-0.5">Year 10–11 · cohort + private</span>
            </Link>
            <Link href="/programmes" className="block border rounded-xl bg-white p-4 hover:border-brand-blue transition-colors">
              <span className="font-semibold text-sm">IGCSE Mathematics</span>
              <span className="block text-xs text-ink-500 mt-0.5">Year 10–11 · cohort + private</span>
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
    </main>
  );
}
