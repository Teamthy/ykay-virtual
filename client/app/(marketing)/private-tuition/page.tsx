import type { Metadata } from "next";
import {
  buildMetadata,
  breadcrumbJsonLd,
  courseJsonLd,
  faqJsonLd,
} from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { PrivateTuitionWizard } from "@/features/tuition/PrivateTuitionWizard";
import { Check, PhoneCall } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title:
    "Private Tuition - One-to-One Learning with Vetted Tutors | YK-Virtual",
  description:
    "Request one-to-one tuition: tell us the learner's level, subject, goals and schedule - we match you with a vetted tutor. Escrow-protected payments.",
  path: "/private-tuition",
});

const FAQS = [
  {
    question: "How are tutors matched?",
    answer:
      "Advisors match your request to an approved tutor based on subject, level, schedule and goals. You can also browse the marketplace and name a tutor.",
  },
  {
    question: "How much does private tuition cost?",
    answer:
      "Rates vary by subject, level and tutor. The rate is agreed before any payment — funds sit in escrow until lessons are delivered. There is no published starting price on this page.",
  },
  {
    question: "Can I change or cancel lessons?",
    answer:
      "Lessons can be rescheduled within your package window. Unused escrow balances are refundable per the published policy.",
  },
];

const REASONS = [
  "Tutors are identity-verified, background-checked and competency-assessed before they teach.",
  "Lesson notes and progress reports follow sessions — described, not turned into a predicted grade.",
  "Payment is held in escrow and released only after delivery.",
  "Rescheduling stays inside the package window you agree.",
];

export default function PrivateTuitionPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Private Tuition",
      item: "https://virtual.ykaycollege.com/private-tuition",
    },
  ]);
  const course = courseJsonLd({
    name: "Private Tuition at YK-Virtual",
    description:
      "One-to-one learning with vetted tutors - British and Nigerian curricula and exam preparation.",
    provider: "YK-Virtual",
    url: "https://virtual.ykaycollege.com/private-tuition",
  });
  const faq = faqJsonLd(FAQS);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />
      <PageHero
        cover="/home/card-tuition.jpg"
        eyebrow="One learner, one tutor"
        title="Private Tuition"
        subtitle="Seven short steps. An advisor matches a vetted tutor and agrees the rate before any payment. The fee sits in escrow until lessons are delivered."
        crumbs={[{ name: "Home", href: "/" }, { name: "Private Tuition" }]}
      />

      <section className="w-full bg-[#F9F6ED] py-12 lg:py-16">
        <div className="container-x grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <PrivateTuitionWizard />
          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="rounded-[20px] border border-black/10 bg-white p-6">
              <h2 className="font-display text-[22px] uppercase text-[#0F2A1A]">What you get</h2>
              <ul className="mt-4 space-y-3">
                {REASONS.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="text-[13px] leading-relaxed text-[#0F2A1A]/75">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[20px] bg-[#0F2A1A] p-6 text-white">
              <h2 className="font-display text-[22px] uppercase">Prefer to talk?</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                An advisor can walk through subjects and scheduling. The quote still comes before payment.
              </p>
              <a
                href="/contact"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-3 text-[13px] font-bold text-[#0F2A1A]"
              >
                <PhoneCall size={15} /> Contact an advisor
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section className="w-full bg-white py-14 lg:py-16">
        <div className="container-x">
          <h2 className="font-display text-[clamp(1.8rem,3vw,2.6rem)] uppercase text-[#0F2A1A]">
            Frequently asked questions
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {FAQS.map((f) => (
              <details key={f.question} className="rounded-[20px] border border-black/10 bg-[#F9F6ED] px-5 py-4">
                <summary className="cursor-pointer text-[14px] font-bold text-[#0F2A1A]">{f.question}</summary>
                <p className="mt-3 text-[13px] leading-relaxed text-[#0F2A1A]/70">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <StepsToTutor
        title="Get a tutor in 3 simple steps"
        steps={[
          {
            n: "1",
            title: "Place a tutor request",
            desc: "Tell us the learner, the subject, the goals and the timetable.",
          },
          {
            n: "2",
            title: "Meet your tutor",
            desc: "Review the vetted match and agree the rate before you pay.",
          },
          {
            n: "3",
            title: "Lessons begin",
            desc: "Payment sits in escrow until each lesson is delivered, with notes after the session.",
          },
        ]}
      />
    </main>
  );
}
