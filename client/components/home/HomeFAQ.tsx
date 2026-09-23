import { faqJsonLd } from "@/lib/seo";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const FAQS = [
  {
    q: "WHAT IF I MISS A SESSION?",
    a: "All live sessions are recorded. You get instant access to recordings, notes and assignments — so you never miss learning.",
    open: false,
  },
  {
    q: "HOW DO I CHOOSE THE RIGHT PROGRAM?",
    a: "You can start by sharing your goals and preferences. Based on that, we'll recommend the most suitable plan for you — cohort or private tuition.",
    open: true,
  },
  {
    q: "CAN I SWITCH PROGRAMS LATER?",
    a: "Yes. You can switch from cohort to private or between curricula. Your wallet balance and progress stay with you.",
    open: false,
  },
  {
    q: "DO YOU PROVIDE LEARNING GUIDANCE?",
    a: "Yes. Every learner gets a personalised plan, tutor feedback, parent reports and support to stay consistent.",
    open: false,
  },
  {
    q: "HOW SOON WILL I SEE RESULTS?",
    a: "Most families see improved confidence and scores within 4-6 weeks of consistent sessions and assignment completion.",
    open: false,
  },
];

export function HomeFAQ() {
  const jsonLd = faqJsonLd(FAQS.map((f) => ({ question: f.q, answer: f.a })));
  return (
    <section className="relative w-full overflow-hidden bg-[#F9F6ED]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] max-w-[1200px] mx-auto items-start">
          {/* left */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">{"<<"} FAQ {">>"}</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.95] tracking-[-0.02em] text-[#0F2A1A] uppercase">
              Frequently asked question
            </h2>

            <div className="mt-8 rounded-[20px] bg-[#0F2A1A] p-6 text-white lg:p-7">
              <h3 className="font-display text-[18px] leading-[1] uppercase tracking-wide">Still have questions?</h3>
              <p className="mt-3 text-[13px] leading-[1.5] text-white/70">Send your questions anytime — I&apos;m happy to help with programmes, pricing or tutor matching.</p>
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#D6FF57]/15 px-1 py-1 pr-1.5 text-[12px] font-bold text-white border border-[#D6FF57]/20 hover:bg-[#D6FF57]/25">
                <span className="rounded-full bg-[#D6FF57] px-4 py-2 text-[#0F2A1A]">Contact</span>
                <span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                  <ArrowRight size={14} />
                </span>
              </Link>
            </div>
          </div>

          {/* right accordion */}
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} open={f.open} className="group rounded-[16px] bg-white p-5 shadow-[0_2px_16px_rgba(15,42,26,0.06)] open:shadow-[0_8px_32px_rgba(15,42,26,0.08)] transition">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="text-[13px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">{f.q}</span>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border transition ${f.open ? "bg-[#D6FF57] border-[#D6FF57] text-[#0F2A1A]" : "bg-white border-black/10 text-[#0F2A1A] group-hover:border-[#0F2A1A]/20"}`}>
                    <span className="text-[14px] font-bold leading-none">{f.open ? "×" : "+"}</span>
                  </span>
                </summary>
                <div className="pt-3">
                  <p className="text-[13px] leading-[1.6] text-[#0F2A1A]/70">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
