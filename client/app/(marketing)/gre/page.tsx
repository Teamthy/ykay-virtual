import type { Metadata } from "next";
import Link from "next/link";
import {
  buildMetadata,
  breadcrumbJsonLd,
  courseJsonLd,
  faqJsonLd,
} from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "GRE Prep - Quant, verbal and writing | YK-Virtual",
  description:
    "GRE preparation with vetted tutors: quant drills, verbal strategies, analytical writing feedback and full practice tests.",
  path: "/gre",
});

const INCLUDES = [
  "Personal diagnostic + target-score study plan",
  "Full-length GRE practice tests (PowerPrep-style)",
  "Quant, verbal & analytical writing drills",
  "Vocabulary building with spaced repetition",
  "Weekly progress reports to parents",
  "Flexible online or in-person sessions",
];

const FAQS = [
  {
    question: "How long does GRE prep take?",
    answer:
      "Most students prepare 10-14 weeks with 2-3 sessions per week, depending on their diagnostic score and target.",
  },
  {
    question: "Is the computer-adaptive GRE covered?",
    answer:
      "Yes - we train on the current GRE General Test format with official-style practice tests.",
  },
  {
    question: "Can we start before booking a full package?",
    answer:
      "Yes, request a free diagnostic session with a tutor and decide after.",
  },
];

export default function GrePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            courseJsonLd({
              name: "YK-Virtual GRE Preparation",
              description:
                "GRE preparation with vetted tutors - quant and verbal drills, analytical writing feedback and full practice tests.",
              provider: "YK-Virtual",
              url: "https://virtual.ykaycollege.com/gre",
            }),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <PageHero
        eyebrow="Exam preparation"
        title="GRE prep from your diagnostic"
        subtitle="Verbal, quant and analytical writing with a vetted tutor. We do not advertise a 320+ guarantee."
      />
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-navy">
              What&apos;s included
            </h2>
            <ul className="mt-4 space-y-3">
              {INCLUDES.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-ink-700"
                >
                  <Check
                    size={16}
                    className="mt-0.5 shrink-0 text-brand-gold-dark"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/private-tuition?goal=gre"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Request a tutor <ArrowRight size={15} />
            </Link>
          </div>
          <div className="rounded-2xl border border-ink-100 bg-white p-6">
            <h2 className="text-lg font-bold text-brand-navy">
              Common questions
            </h2>
            <div className="mt-4 space-y-4">
              {FAQS.map((f) => (
                <div key={f.question}>
                  <p className="text-sm font-semibold text-ink-800">
                    {f.question}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-600">
                    {f.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
