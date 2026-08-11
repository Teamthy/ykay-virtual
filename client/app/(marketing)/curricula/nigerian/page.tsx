import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Nigerian Curriculum Online — JSS1–3, SSS1–3, WAEC, NECO, JAMB | YKAY",
  description:
    "Nigerian curriculum learning online: JSS1–3 and SSS1–3 with WAEC, NECO and JAMB preparation — cohorts, private tuition and exam bootcamps with vetted tutors.",
  path: "/curricula/nigerian",
});

const STAGES = [
  { title: "JSS1 – JSS3", desc: "Junior secondary foundations in Mathematics, English, Basic Science and more.", subjects: ["Mathematics", "English", "Basic Science", "Computer Studies"] },
  { title: "SSS1 – SSS3", desc: "Senior secondary pathways with subject specialisation and exam focus.", subjects: ["Mathematics", "English", "Physics", "Biology", "Economics"] },
  { title: "WAEC · NECO · JAMB", desc: "Focused exam preparation: past questions, mocks and revision plans.", subjects: ["WAEC", "NECO", "JAMB/UTME", "Post-UTME"] },
];

const FAQS = [
  { question: "Can I prepare for WAEC and NECO at the same time?", answer: "Yes — the syllabuses overlap heavily. Our tutors align lesson plans to both examinations." },
  { question: "Is JAMB preparation separate from school lessons?", answer: "JAMB/UTME prep runs as a focused programme (cohort or private) with past-question analysis and CBT mocks." },
  { question: "Do you cover the new Nigerian curriculum?", answer: "We follow the current national curriculum framework (NERDC) across JSS and SSS." },
];

export default function NigerianCurriculumPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Nigerian Curriculum", item: "https://ykayvirtual.com/curricula/nigerian" },
  ]);
  const course = courseJsonLd({
    name: "Nigerian Curriculum Online",
    description: "JSS1–3 and SSS1–3 learning with WAEC, NECO and JAMB preparation from vetted subject specialists.",
    provider: "YKAY Virtual School",
    url: "https://ykayvirtual.com/curricula/nigerian",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Curricula" }, { name: "Nigerian Curriculum" }]} />

      <section className="text-center max-w-3xl mx-auto">
        <p className="tag-handwritten">Nigerian pathway</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mt-2">Nigerian Curriculum Online</h1>
        <p className="mt-4 text-ink-600">
          Junior and senior secondary learning with WAEC, NECO and JAMB preparation — structured,
          exam-focused and taught by vetted Nigerian educators.
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/exam-prep" className="btn-primary">Exam preparation</Link>
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

      <section className="mt-14 rounded-3xl bg-ink-50 border border-ink-100 p-8 md:p-12 grid md:grid-cols-3 gap-8">
        {[
          { title: "WAEC", desc: "Core and elective subjects with past-question practice." },
          { title: "NECO", desc: "Aligned preparation across the shared syllabus." },
          { title: "JAMB / UTME", desc: "AI-analysed past questions, topic focus and CBT mocks." },
        ].map((e) => (
          <div key={e.title} className="text-center">
            <div className="text-2xl font-extrabold text-brand-blue">{e.title}</div>
            <p className="mt-2 text-sm text-ink-600">{e.desc}</p>
          </div>
        ))}
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
