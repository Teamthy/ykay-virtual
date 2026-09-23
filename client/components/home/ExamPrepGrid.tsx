import Link from "next/link";
import { examCards } from "@/lib/site-data";
import { ArrowRight } from "lucide-react";

export function ExamPrepGrid() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{"<<"} Exam Preparation {">>"}</p>
            <h2 className="mx-auto mt-3 max-w-[18ch] font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.95] tracking-[-0.02em] text-white uppercase">
              Get expert help to ace your exam
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
            {examCards.slice(0, 9).map((card, i) => (
              <Link
                key={i}
                href={card.href}
                className="group relative flex min-h-[180px] flex-col justify-between rounded-[20px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:border-white"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-white/60 group-hover:text-[#0F2A1A]/65">{String(i+1).padStart(2, "0")}</span>
                  <span className="grid size-7 place-items-center rounded-full bg-white/10 text-white group-hover:bg-[#0F2A1A] group-hover:text-white transition">
                    <ArrowRight size={12} />
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-[18px] leading-[0.95] text-white group-hover:text-[#0F2A1A]">{card.title}</h3>
                  <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-white/50 group-hover:text-[#0F2A1A]/65">CBT · Past questions</p>
                </div>
                <div className="mt-3">
                  <span className="inline-flex rounded-full bg-[#D6FF57] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A] opacity-0 group-hover:opacity-100 transition">Get Started</span>
                </div>
              </Link>
            ))}
            <Link href="/exam-prep" className="group flex min-h-[180px] flex-col justify-center rounded-[20px] bg-[#D6FF57] p-5 transition hover:-translate-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Need a plan?</p>
              <h3 className="mt-2 font-display text-[18px] leading-[0.95] text-[#0F2A1A]">Talk to an exam coach</h3>
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-[#0F2A1A] px-4 py-2 text-[12px] font-bold text-white">
                Book call <ArrowRight size={12} />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
