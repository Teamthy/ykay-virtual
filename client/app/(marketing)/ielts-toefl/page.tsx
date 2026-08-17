import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "IELTS & TOEFL Prep — Band 7+ / 100+ | NUVORA",
  description:
    "IELTS and TOEFL iBT preparation with vetted tutors: speaking drills, writing correction, listening practice and full mock tests.",
  path: "/ielts-toefl",
});

const INCLUDES = [
  "Placement test + target band study plan",
  "Full IELTS/TOEFL mock tests with band scoring",
  "Speaking drills with feedback & writing correction",
  "Listening & reading techniques for speed",
  "Weekly progress reports to parents",
  "Flexible online or in-person sessions",
];

const FAQS = [
  { question: "How long does IELTS/TOEFL prep take?", answer: "Most students prepare 6–12 weeks with 2–3 sessions per week, depending on their current band and target score." },
  { question: "Do you cover both IELTS and TOEFL?", answer: "Yes — we cover IELTS Academic and General Training as well as TOEFL iBT, including the current TOEFL format." },
  { question: "Can we start before booking a full package?", answer: "Yes, request a free placement test with a tutor and decide after." },
];

export default function IeltsToeflPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd({
          name: "NUVORA IELTS & TOEFL Preparation",
          description: "IELTS and TOEFL iBT preparation with vetted tutors — speaking drills, writing correction and full mock tests.",
          provider: "NUVORA",
          url: "https://nuvora.com/ielts-toefl",
        })) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <PageHero
        eyebrow="Exam preparation"
        title="IELTS & TOEFL Prep — Band 7+ / 100+"
        subtitle="Reach your target band with a vetted tutor: speaking practice, writing correction and full mock tests for IELTS or TOEFL iBT."
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
            <Link href="/private-tuition?goal=ielts-toefl" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover">
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
