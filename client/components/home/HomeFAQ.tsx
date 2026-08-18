import { faqJsonLd } from "@/lib/seo";
import Link from "next/link";

const FAQS = [
  { q: "How do I enrol my child in a cohort?", a: "Browse programmes, choose a cohort, enrol and pay - your payment is held in escrow until the programme delivers. See How It Works for the full walkthrough." },
  { q: "Are your tutors vetted?", a: "Yes. Every tutor passes identity verification, document review, an interview and a subject competency assessment before approval." },
  { q: "Which curricula do you cover?", a: "British (Year 7-9, IGCSE, A-Level) and Nigerian (JSS, SSS) curricula, plus WAEC, NECO, JAMB and IGCSE exam preparation." },
  { q: "How is my payment protected?", a: "Payments go into escrow and are released to the tutor only after lessons are delivered - or refunded per policy." },
];

export function HomeFAQ() {
  const jsonLd = faqJsonLd(FAQS.map((f) => ({ question: f.q, answer: f.a })));
  return (
    <section className="container-x py-16 md:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto">
        <div className="text-center">
          <p className="tag-handwritten">Questions, answered</p>
          <h2 className="text-3xl font-extrabold mt-1">Frequently asked questions</h2>
        </div>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="border rounded-xl px-5 py-4">
              <summary className="font-semibold cursor-pointer">{f.q}</summary>
              <p className="mt-2 text-sm text-ink-600">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          More questions?{" "}
          <Link href="/help" className="text-brand-green font-semibold hover:underline">
            Visit the Help Center
          </Link>
          {" "}or{" "}
          <Link href="/contact" className="text-brand-green font-semibold hover:underline">
            contact our team
          </Link>
        </p>
      </div>
    </section>
  );
}
