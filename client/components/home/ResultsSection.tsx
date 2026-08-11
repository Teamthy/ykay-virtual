"use client";
import { useState } from "react";
import { accordionItems } from "@/lib/site-data";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultsSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-24 md:py-28 bg-brand-navy text-white text-center relative overflow-hidden">
      <div className="container-x relative">
        <div className="tag-handwritten mb-4" style={{ fontSize: "28px" }}>
          We deliver the best results, period.
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight mb-16">
          NUVORA students perform 3x better in class<br />
          and school examinations
        </h2>

        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center text-left">
          {/* Bar chart */}
          <div className="relative h-[440px] flex items-end justify-center gap-10 pl-16">
            <div className="absolute left-5 top-5 bottom-28 w-0.5 bg-white before:content-[''] before:absolute before:-top-2 before:-left-1.5 before:border-[7px] before:border-transparent before:border-b-white after:content-[''] after:absolute after:-bottom-2 after:-left-1.5 after:border-[7px] after:border-transparent after:border-t-white" />
            <div className="absolute left-14 top-[40%] text-brand-gold font-bold text-3xl font-bold text-center leading-tight">
              3x<br />growth
            </div>
            <div className="relative flex flex-col items-center">
              <div className="w-32 md:w-[150px] h-[130px] bg-[#f0f0f0] rounded-t-md flex items-center justify-center text-ink-800 font-bold font-bold text-xl md:text-2xl text-center leading-tight p-5 shadow-[8px_0_0_#999]">
                School<br />only
              </div>
              <div className="mt-3.5 text-white font-bold font-bold text-base text-center">School only</div>
            </div>
            <div className="relative flex flex-col items-center">
              <div className="w-32 md:w-[150px] h-[340px] bg-brand-gold rounded-t-md flex items-center justify-center text-ink-800 font-bold font-bold text-xl md:text-2xl text-center leading-tight p-5 shadow-[8px_0_0_#b8860b]">
                NUVORA<br />Tutoring
              </div>
              <div className="mt-3.5 text-white font-bold font-bold text-base text-center">School + NUVORA</div>
            </div>
          </div>

          {/* Accordion */}
          <div>
            <h3 className="text-2xl md:text-3xl font-extrabold mb-8 leading-snug">
              Our innovative approach ensures your child achieves stellar results
            </h3>
            {accordionItems.map((item, i) => (
              <div key={i} className="bg-white/6 rounded-xl mb-3 overflow-hidden border border-white/10">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center gap-4 cursor-pointer text-base font-semibold text-left hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 bg-white text-brand-navy rounded-md flex items-center justify-center text-sm font-extrabold flex-shrink-0">
                    {item.num}
                  </div>
                  <div className="flex-1">{item.title}</div>
                  <ChevronDown size={14} className={cn("opacity-70 transition-transform", open === i && "rotate-180")} />
                </button>
                {open === i && (
                  <div className="px-6 pb-5 pl-[76px] text-sm opacity-85 leading-relaxed">{item.content}</div>
                )}
              </div>
            ))}
            <button className="w-full mt-5 py-5 bg-brand-blue rounded-lg text-white text-sm font-bold hover:bg-brand-blue-dark transition-colors">
              Get started today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}