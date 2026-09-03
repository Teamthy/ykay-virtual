import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 FAQ - NUVORA Prep | NUVORA",
  description:
    "Frequently asked questions about NUVORA UTME 2026 prep: lessons, schedules, instalments, scholarships, exam boards and more.",
  path: "/utme-2026/faq",
  noIndex: true,
});

const FAQS = [
  {
    question: "What other subjects do you offer?",
    answer:
      "Our UTME prep covers Use of English, Mathematics, Physics, Chemistry and Biology. For other subjects, request private tuition and we'll match a specialist tutor.",
  },
  {
    question: "Why are our courses better than one-to-one tuition?",
    answer:
      "You get expert-led live classes, a structured curriculum, 200+ practice exams, weekly mock CBT and peer support - plus remedial classes when you need them. That combination is far more effective than isolated private lessons.",
  },
  {
    question: "When are the live lessons?",
    answer:
      "Live classes run January to April 2026, on weekday evenings and weekend mornings, so they fit around school. All classes are recorded and can be re-watched anytime.",
  },
  {
    question: "How can I be sure that each student gets enough attention?",
    answer:
      "Cohorts are small, every student gets weekly performance reports, and the Plus plan includes a dedicated mentor plus remedial classes for anyone who needs extra help.",
  },
  {
    question: "How can I be sure that the course will be effective for me?",
    answer:
      "Our AI has analyzed 20,000+ JAMB questions from the past 15 years to focus the curriculum on the most likely exam topics - and our 2025 cohort produced scores of 345, 341, 338 and 317.",
  },
  {
    question: "What exam boards do the courses cover?",
    answer:
      "The UTME 2026 prep is built for JAMB. We also run prep for WAEC, NECO, IGCSE, GCSE, BECE, 11+, Common Entrance and SAT - see the entrance exam page.",
  },
  {
    question: "Are there any special requirements for enrolling?",
    answer:
      "None - any candidate writing JAMB 2026 can join. We run a free diagnostic test at enrolment to place you on the right track.",
  },
  {
    question: "What happens if I miss a lesson?",
    answer:
      "All live classes are recorded and available for re-watch anytime, so you never fall behind. You can also join remedial classes if you need to catch up on a topic.",
  },
];

export default function UtmeFaqPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "UTME 2026", item: "https://nuvora.com/utme-2026" },
    { name: "FAQ", item: "https://nuvora.com/utme-2026/faq" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <main className="bg-[#FFF7E4] min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      {/* Header */}
      <header className="border-b border-ink-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6">
          <nav className="flex items-center justify-between gap-4">
            <Link
              href="/utme-2026"
              className="font-display text-xl tracking-[0.02em] text-[#013920]"
            >
              NUVORA <span className="text-[#4CCB31]">Prep</span>
            </Link>
            <div className="flex items-center gap-5 text-sm font-bold">
              <Link
                href="/utme-2026"
                className="text-ink-600 hover:text-[#013920]"
              >
                Overview
              </Link>
              <Link
                href="/utme-2026/pricing"
                className="text-ink-600 hover:text-[#013920]"
              >
                Pricing
              </Link>
              <Link href="/utme-2026/faq" className="text-[#4CCB31]">
                FAQ
              </Link>
              <Link
                href="/utme-2026"
                className="rounded-xl bg-[#013920] px-5 py-2.5 text-white hover:bg-[#0A4D32] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="py-16">
        <div className="max-w-[860px] mx-auto px-6 md:px-10">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#4CCB31] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#013920]">
              Read our FAQs
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-[0.02em] text-[#013920] md:text-5xl">
              UTME 2026 - Frequently Asked Questions
            </h1>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.question}
                className="rounded-2xl border border-ink-100 bg-white shadow-soft open:shadow-card"
              >
                <summary className="cursor-pointer px-6 py-5 font-bold text-ink-800">
                  {f.question}
                </summary>
                <p className="px-6 pb-5 text-sm leading-relaxed text-ink-600">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>

          <div className="mt-10 rounded-2xl bg-[#013920] p-8 text-center text-white">
            <p className="font-display text-2xl tracking-[0.02em]">
              Still have questions?
            </p>
            <p className="mt-2 text-white/70">
              Chat with our advisors - we answer within one business day.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link
                href="/utme-2026#callback"
                className="rounded-xl bg-[#4CCB31] px-7 py-3.5 text-sm font-bold text-[#013920] hover:bg-[#5FE63F] transition-colors"
              >
                Get a callback
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-white/30 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
              >
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
