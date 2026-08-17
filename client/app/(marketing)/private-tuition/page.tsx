import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CategoryRail } from "@/components/layout/CategoryRail";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { PrivateTuitionWizard } from "@/features/tuition/PrivateTuitionWizard";
import { Check, PhoneCall } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Private Tuition — One-to-One Learning with Vetted Tutors | NUVORA",
  description:
    "Request one-to-one tuition in 7 steps: tell us the learner's level, subject, goals and schedule — we match you with a vetted tutor. Escrow-protected payments.",
  path: "/private-tuition",
});

const FAQS = [
  {
    question: "How are tutors matched?",
    answer:
      "Our advisors match your request to an approved tutor based on subject, level, schedule and learning goals. You can also browse the tutor marketplace and request a specific tutor.",
  },
  {
    question: "How much does private tuition cost?",
    answer:
      "Rates vary by subject, level and tutor experience. Your advisor agrees the rate before any payment — and payments are held in escrow until lessons are delivered.",
  },
  {
    question: "Can I change or cancel lessons?",
    answer:
      "Yes. Lessons can be rescheduled within your package window and cancellations follow our published policy. Unused escrow balances are refundable per policy.",
  },
];

export default function PrivateTuitionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Private Tuition", item: "https://nuvora.com/private-tuition" },
  ]);
  const course = courseJsonLd({
    name: "Private Tuition at NUVORA",
    description: "One-to-one learning with vetted tutors — British and Nigerian curricula, exam preparation and digital skills.",
    provider: "NUVORA",
    url: "https://nuvora.com/private-tuition",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main className="container-x py-10">
      <PageHero
        eyebrow="One learner, one tutor"
        title="Private Tuition"
        subtitle="Tell us what your learner needs — we&apos;ll match a vetted tutor, agree a plan and protect your payment in escrow until lessons are delivered."
        crumbs={[{ name: "Home", href: "/" }, { name: "Private Tuition" }]}
        align="center"
      >
      </PageHero>

      <div className="mt-10 grid lg:grid-cols-[220px_1fr] gap-8 items-start">
        <aside className="lg:sticky lg:top-28">
          <CategoryRail />
        </aside>
        <div>
      <section className="grid lg:grid-cols-[1fr_0.9fr] gap-10 items-start">
        <PrivateTuitionWizard />
        <aside className="space-y-5 lg:sticky lg:top-28">
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
              Our advisors can guide you through options and pricing on a call.
            </p>
            <a href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-3 text-sm font-bold text-ink-900 transition-transform hover:-translate-y-0.5">
              <PhoneCall size={15} /> Contact an advisor
            </a>
          </div>
        </aside>
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
            </div>
      </div>
          <StepsToTutor
        title="Get a tutor in 3 simple steps"
        steps={[
          { n: "1", title: "Place a tutor request", desc: "Fill a quick request form and tell us your learner's goals, schedule and the subjects you need help with." },
          { n: "2", title: "Meet your perfect tutor", desc: "You receive options of expert tutors near you — review profiles, ratings and availability, then select your preferred tutor." },
          { n: "3", title: "Study and succeed", desc: "Begin lessons immediately with an agreed plan, protected payments and weekly progress reports for parents." },
        ]}
      />
      <GuaranteeBand />
    </main>
  );
}
