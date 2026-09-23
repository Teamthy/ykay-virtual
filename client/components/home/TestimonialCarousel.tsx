"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarouselItem = {
  id: string;
  text: string;
  name: string;
  location?: string;
};

export function TestimonialCarousel({ items }: { items: CarouselItem[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => setActive((p) => (p + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const next = () => setActive((active + 1) % items.length);
  const prev = () => setActive((active - 1 + items.length) % items.length);
  const current = items[active];

  return (
    <section className="relative w-full overflow-hidden bg-[#F9F6ED]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/50">{"<<"} Parent Stories {">>"}</p>
              <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.9] tracking-[-0.02em] text-[#0F2A1A] uppercase">Parents love YK-Virtual</h2>
            </div>
            {items.length > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={prev} aria-label="Previous" className="grid size-9 place-items-center rounded-full border border-black/10 bg-white hover:bg-[#0F2A1A] hover:text-white transition">
                  <ArrowLeft size={14} />
                </button>
                <button onClick={next} aria-label="Next" className="grid size-9 place-items-center rounded-full bg-[#0F2A1A] text-white hover:bg-black transition">
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-[24px] bg-white p-8 shadow-[0_8px_40px_rgba(15,42,26,0.08)] lg:p-10">
            <div className="flex gap-6">
              <div className="hidden sm:grid size-12 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A] shrink-0">
                <Quote size={20} />
              </div>
              <div className="flex-1">
                <p key={current.id} className="text-[18px] leading-[1.6] text-[#0F2A1A] lg:text-[20px] animate-fade-in">
                  &ldquo;{current.text}&rdquo;
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">{current.name}</p>
                    {current.location && <p className="mt-1 text-[12px] text-[#0F2A1A]/60">{current.location}</p>}
                    <div className="mt-2 flex text-[12px]">★★★★★</div>
                  </div>
                  {items.length > 1 && (
                    <div className="flex gap-1.5">
                      {items.map((_, i) => (
                        <button key={i} onClick={() => setActive(i)} className={cn("h-1.5 rounded-full transition-all", i === active ? "w-6 bg-[#0F2A1A]" : "w-1.5 bg-black/15")} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
