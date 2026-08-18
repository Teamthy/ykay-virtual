import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "SAT Prep - Target 1400+ | NUVORA",
  description:
    "Digital SAT preparation with vetted tutors: full-length practice tests, section drills and a personal study plan for Reading, Writing and Math.",
  path: "/sat",
});

const INCLUDES = [
  "Personal diagnostic + target-score study plan",
  "Digital SAT full-length practice tests with auto-scoring",
  "Reading, Writing & Math section drills",
  "Vocabulary and grammar foundations",
  "Weekly progress reports to parents",
  "Flexible online or in-person sessions",
];

const FAQS = [
  { question: "How long does SAT prep take?", answer: "Most students prepare 8-16 weeks with 2-3 sessions per week, depending on their diagnostic and target score." },
  { question: "Is the digital SAT covered?", answer: "Yes - we train on the current Digital SAT format with Bluebook-style practice tests." },
  { question: "Can we start before booking a full package?", answer: "Yes, request a free diagnostic session with a tutor and decide after." },
];

export default function SatPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd({
          name: "NUVORA SAT Preparation",
          description: "Digital SAT prep with vetted tutors - diagnostics, section drills and full practice tests.",
          provider: "NUVORA",
          url: "https://nuvora.com/sat",
        })) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <PageHero
        eyebrow="Exam preparation"
        title="SAT Prep - Target 1400+"
        subtitle="Master the Digital SAT with a vetted tutor, personalised drills and full-length practice tests."
      />
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-navy">What&apos;s included</h2>
            <ul className="mt-4 space-y-3">
              {INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-gold-dark" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/private-tuition?goal=sat" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover">
              Request a tutor <ArrowRight size={15} />
            </Link>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-navy">Common questions</h2>
            <div className="mt-4 space-y-4">
              {FAQS.map((f) => (
                <div key={f.question}>
                  <p className="text-sm font-semibold text-ink-800">{f.question}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-600">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
