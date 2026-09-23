import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 FAQ - YK-Virtual Prep | YK-Virtual",
  description:
    "Frequently asked questions about YK-Virtual UTME 2026 prep: lessons, schedules, instalments, scholarships, exam boards and more.",
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
    question: "How is a cohort different from one-to-one tuition?",
    answer:
      "Cohorts add a structured plan, tutor-led lessons and peer learning to individual practice. One-to-one tuition is available for students who need a more personalised pace; neither option can guarantee a score.",
  },
  {
    question: "When are the live lessons?",
    answer:
      "The 2026 session has ended. Check the live cohorts catalogue or ask an advisor for the next published timetable and the availability of recordings.",
  },
  {
    question: "How can I be sure that each student gets enough attention?",
    answer:
      "Cohorts are kept small, with progress notes for families. Ask about group size and whether named mentor support is available in the current intake before enrolling.",
  },
  {
    question: "How can I be sure that the course will be effective for me?",
    answer:
      "Tutors use past-question patterns, topic practice and timed mocks to identify weak areas. We do not predict the exam paper or guarantee a score or university place.",
  },
  {
    question: "What exam boards do the courses cover?",
    answer:
      "The UTME 2026 prep is built for JAMB. We also run prep for WAEC, NECO, IGCSE, GCSE, BECE, 11+, Common Entrance and SAT - see the entrance exam page.",
  },
  {
    question: "Are there any special requirements for enrolling?",
    answer:
      "Ask an advisor which intake is open and whether a diagnostic is required. Prices and schedules must be confirmed before you pay.",
  },
  {
    question: "What happens if I miss a lesson?",
    answer:
      "Where recordings are included, you can rewatch the lesson and ask a tutor about topics you missed. Ask an advisor which catch-up options your plan includes.",
  },
];

export default function UtmeFaqPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "UTME 2026", item: "https://virtual.ykaycollege.com/utme-2026" },
    { name: "FAQ", item: "https://virtual.ykaycollege.com/utme-2026/faq" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <main className="min-h-screen bg-[#F9F6ED]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <PageHero
        eyebrow="UTME / questions answered"
        title="Good questions make a better plan."
        subtitle="How lessons, mocks and mentoring work — and what you should confirm before choosing your next intake."
        crumbs={[{ name: "Home", href: "/" }, { name: "UTME 2026", href: "/utme-2026" }, { name: "FAQs" }]}
        ctas={[{ label: "See the packages", href: "/utme-2026/pricing", primary: true }]}
      />
      <section className="w-full py-14 lg:py-20">
        <div className="container-x grid items-start gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">Before you begin</p>
            <h2 className="mt-3 max-w-[17ch] font-display text-[clamp(2rem,3vw,3rem)] uppercase text-[#0F2A1A]">Everything you need to know.</h2>
            <p className="mt-4 max-w-[40ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">The 2026 sitting has passed. Ask an advisor about the next intake, fee and timetable rather than relying on last year&apos;s dates.</p>
            <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-3 text-[12px] font-bold text-white hover:bg-[#194732]">Talk to an advisor <ArrowRight size={14} /></Link>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, index) => (
              <details key={item.question} className="group rounded-[20px] border border-black/10 bg-white p-5 shadow-soft open:border-[#0F2A1A]/20 sm:p-6">
                <summary className="flex cursor-pointer list-none items-center gap-4 text-left font-bold text-[#0F2A1A] marker:hidden">
                  <span className="shrink-0 font-display text-[15px] text-[#0F2A1A]/65">0{index + 1}</span>
                  <span className="flex-1 text-[14px] sm:text-[16px]">{item.question}</span>
                  <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 border-t border-black/10 pt-4 text-[13px] leading-relaxed text-[#0F2A1A]/70">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full bg-[#0F2A1A] py-12 text-white lg:py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D6FF57]">Need a human answer?</p>
            <h2 className="mt-2 font-display text-[clamp(1.7rem,3vw,3rem)] uppercase text-white">Let&apos;s find your next step.</h2>
          </div>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">Contact support <ArrowRight size={15} /></Link>
        </div>
      </section>
    </main>
  );
}
