"use client";
import { useEffect, useState } from "react";
import { testimonials } from "@/lib/site-data";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TestimonialSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % testimonials.length), 6500);
    return () => clearInterval(t);
  }, []);

  const next = () => setActive((active + 1) % testimonials.length);
  const prev = () => setActive((active - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-24 md:py-28 bg-brand-navy text-white text-center relative">
      <button
        onClick={prev}
        className="hidden md:flex absolute left-[6%] top-1/2 -translate-y-1/2 w-12 h-12 bg-brand-blue rounded-full items-center justify-center hover:bg-brand-blue-dark hover:scale-105 transition-all"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-[6%] top-1/2 -translate-y-1/2 w-12 h-12 bg-brand-blue rounded-full items-center justify-center hover:bg-brand-blue-dark hover:scale-105 transition-all"
      >
        <ChevronRight size={22} />
      </button>

      <div className="max-w-[920px] mx-auto px-6 md:px-10">
        <div className="text-[100px] text-white/12 leading-[0.6] mb-5 font-serif">&ldquo;</div>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-11 tracking-tight">Parents love YKAY</h2>
        <p key={active} className="text-lg md:text-xl leading-relaxed mb-11 opacity-95 animate-fade-in">
          {testimonials[active].text}
        </p>
        <div className="text-brand-gold text-xl mb-6 tracking-[2px]">★★★★★</div>
        <div className="text-lg font-bold mb-1">{testimonials[active].name}</div>
        <div className="text-sm opacity-70">{testimonials[active].location}</div>

        <div className="flex justify-center gap-2 mt-11">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "h-2 rounded-full transition-all cursor-pointer",
                i === active ? "w-6 bg-white" : "w-2 bg-white/25"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}