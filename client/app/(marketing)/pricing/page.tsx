import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Cohorts, Private Tuition & Exam Prep | NUVORA",
  description:
    "Transparent pricing for cohort programmes, private tuition packages and exam preparation. Escrow-protected payments with clear cancellation policies.",
  path: "/pricing",
});

// Indicative pricing — the definitive quote is always agreed before payment.
const TIERS = [
  {
    tab: "Cohorts",
    plans: [
      { name: "Revision Cohort", price: "₦45,000 – ₦75,000", period: "per term", desc: "12 weekly live sessions, resources, past-paper practice, weekly reports." },
      { name: "Exam Bootcamp", price: "₦75,000 – ₦120,000", period: "per course", desc: "Intensive revision with mocks for WAEC, NECO, JAMB or IGCSE." },
      { name: "Holiday Programme", price: "₦30,000 – ₦60,000", period: "per week", desc: "Focused learning during school breaks, small groups." },
    ],
  },
  {
    tab: "Private Tuition",
    plans: [
      { name: "Starter Pack", price: "₦40,000 – ₦80,000", period: "10 sessions", desc: "One-to-one, 60-minute sessions, flexible scheduling." },
      { name: "Exam Focus Pack", price: "₦90,000 – ₦160,000", period: "20 sessions", desc: "Full exam preparation with progress reports and mocks." },
      { name: "Term-Long Support", price: "Custom quote", period: "per term", desc: "Continuous academic support across multiple subjects." },
    ],
  },
  {
    tab: "Exam Prep",
    plans: [
      { name: "Subject Revision", price: "₦25,000 – ₦50,000", period: "per subject", desc: "Targeted revision with past questions mapped to topics." },
      { name: "Mock Exam Bundle", price: "₦15,000 – ₦30,000", period: "per bundle", desc: "Timed mocks with marking and detailed feedback." },
    ],
  },
  {
    tab: "Digital Skills",
    plans: [
      { name: "Coding Foundations", price: "₦35,000 – ₦70,000", period: "per term", desc: "Python, CS fundamentals and projects for ages 9+." },
      { name: "Certification Prep", price: "Custom quote", period: "per course", desc: "Microsoft Office and professional certification preparation." },
    ],
  },
];

const FAQS = [
  { question: "What is included in the price?", answer: "Live lessons, resources, lesson notes and progress reports. Exam packages add mocks and past-paper practice." },
  { question: "How do I pay?", answer: "Securely by card or bank transfer via our payment gateway. Funds sit in escrow and are released only when lessons are delivered." },
  { question: "Can I cancel or reschedule?", answer: "Yes. Rescheduling is free within your package window. Cancellations follow our published policy and unused escrow balances are refundable per policy." },
];

export default function PricingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Pricing", item: "https://nuvora.com/pricing" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <main className="container-x py-10">
      <PageHero
        eyebrow="Clear, honest pricing"
        title="Pricing"
        subtitle="Indicative ranges below — your advisor confirms the exact quote before any payment. Every payment is escrow-protected."
        crumbs={[{ name: "Home", href: "/" }, { name: "Pricing" }]}
        align="center"
      >
      </PageHero>


      {TIERS.map((tier) => (
        <section key={tier.tab} className="mt-12">
          <h2 className="text-2xl font-extrabold mb-5">{tier.tab}</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {tier.plans.map((p) => (
              <div key={p.name} className="border rounded-2xl p-6 flex flex-col">
                <h3 className="font-bold">{p.name}</h3>
                <div className="mt-3">
                  <span className="text-2xl font-extrabold text-brand-blue">{p.price}</span>
                  <span className="text-sm text-ink-500"> / {p.period}</span>
                </div>
                <p className="mt-3 text-sm text-ink-600 flex-1">{p.desc}</p>
                <Link href="/private-tuition" className="mt-5 btn-gold text-center text-sm">Request a quote</Link>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-10 text-xs text-ink-400">
        Pricing shown is indicative guidance and may vary by tutor experience, subject and level. The
        final quote is always agreed before payment. Institutional pricing for schools and companies is
        available via the <Link href="/for-schools" className="text-brand-blue font-semibold">for schools</Link>{" "}
        and <Link href="/corporate-training" className="text-brand-blue font-semibold">corporate training</Link> pages.
      </p>

      <section className="mt-14 rounded-2xl border p-8">
        <h2 className="text-xl font-extrabold mb-3">Cancellation & reschedule policy</h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm text-ink-700">
          <div>
            <h3 className="font-bold">Rescheduling</h3>
            <p className="mt-1.5">Lessons can be rescheduled free of charge within your package window — with at least 24 hours notice where possible.</p>
          </div>
          <div>
            <h3 className="font-bold">Cancellation</h3>
            <p className="mt-1.5">Unused escrow balances are refundable per policy. Cancellation requests are handled by our support team within one business day.</p>
          </div>
          <div>
            <h3 className="font-bold">Tutor no-show</h3>
            <p className="mt-1.5">If a tutor cannot deliver a scheduled lesson, the session is not counted and the escrow balance is protected — full refunds where required.</p>
          </div>
        </div>
      </section>

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
