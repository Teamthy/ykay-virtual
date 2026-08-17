import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { PrivateTuitionWizard } from "@/features/tuition/PrivateTuitionWizard";
import { Check, PhoneCall } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Private Tuition — One-to-One Learning with Vetted Tutors | NUVORA",
  description:
    "Request one-to-one tuition: tell us the learner's level, subject, goals and schedule — we match you with a vetted tutor. Escrow-protected payments.",
  path: "/private-tuition",
});

const FAQS = [
  {
    question: "How are tutors matched?",
    answer:
      "Advisors match your request to an approved tutor based on subject, level, schedule and goals. You can also browse the marketplace.",
  },
  {
    question: "How much does private tuition cost?",
    answer:
      "Rates vary by subject, level and tutor. The rate is agreed before any payment — funds sit in escrow until lessons are delivered.",
  },
  {
    question: "Can I change or cancel lessons?",
    answer:
      "Lessons can be rescheduled within your package window. Unused escrow balances are refundable per policy.",
  },
];

export default function PrivateTuitionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Private Tuition", item: "https://nuvora.com/private-tuition" },
  ]);
  const course = courseJsonLd({
    name: "Private Tuition at NUVORA",
    description: "One-to-one learning with vetted tutors — British and Nigerian curricula and exam preparation.",
    provider: "NUVORA",
    url: "https://nuvora.com/private-tuition",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <PageHero
        eyebrow="One learner, one tutor"
        title="Private Tuition"
        subtitle="Tell us what your learner needs — we match a vetted tutor and hold payment in escrow until lessons are delivered."
        crumbs={[{ name: "Home", href: "/" }, { name: "Private Tuition" }]}
        image={{ src: "/hero/home-tutoring.jpg", alt: "One-to-one home tutoring session" }}
      />

      <div className="container-x max-w-3xl space-y-8 pt-14 pb-8">
        <PrivateTuitionWizard />
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-soft">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">Why private tuition at NUVORA</h2>
          <ul className="mt-5 space-y-4">
            {[
              "Tutors are identity-verified, background-checked and competency-assessed",
              "Lesson notes, homework and progress reports after every session",
              "Payments held in escrow — released only after delivery",
              "Reschedule-friendly within your package window",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed text-ink-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-brand-navy p-6 text-white shadow-card">
          <h2 className="font-display text-xl tracking-[0.02em]">Prefer to talk?</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            Advisors can walk you through options and pricing on a call.
          </p>
          <a href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-3 text-sm font-bold text-ink-900">
            <PhoneCall size={15} /> Contact an advisor
          </a>
        </div>
        <section>
          <h2 className="mb-6 text-2xl font-extrabold">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.question} className="rounded-xl border px-5 py-4">
                <summary className="cursor-pointer font-semibold">{f.question}</summary>
                <p className="mt-2 text-sm text-ink-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <StepsToTutor
        title="Get a tutor in 3 simple steps"
        steps={[
          { n: "1", title: "Place a tutor request", desc: "Tell us goals, schedule and subjects." },
          { n: "2", title: "Meet your tutor", desc: "Review vetted options and pick who fits." },
          { n: "3", title: "Study and succeed", desc: "Lessons start with escrow-protected payment and weekly reports." },
        ]}
      />
      <GuaranteeBand />
    </main>
  );
}
