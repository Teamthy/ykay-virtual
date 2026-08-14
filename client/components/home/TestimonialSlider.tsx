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
    <section className="py-24 md:py-28 bg-brand-gold text-ink-900 text-center relative">
      <button
        onClick={prev}
        aria-label="Previous testimonial"
        className="hidden md:flex absolute left-[6%] top-1/2 -translate-y-1/2 w-12 h-12 bg-ink-900 text-white rounded-full items-center justify-center hover:bg-black hover:scale-105 transition-all"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={next}
        aria-label="Next testimonial"
        className="hidden md:flex absolute right-[6%] top-1/2 -translate-y-1/2 w-12 h-12 bg-ink-900 text-white rounded-full items-center justify-center hover:bg-black hover:scale-105 transition-all"
      >
        <ChevronRight size={22} />
      </button>

      <div className="max-w-[920px] mx-auto px-6 md:px-10">
        <div className="text-[100px] text-ink-900/15 leading-[0.6] mb-5 font-serif">&ldquo;</div>
        <h2 className="font-display mb-11 text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">Parents love NUVORA</h2>
        <p key={active} className="text-lg md:text-xl leading-relaxed mb-11 text-ink-900 animate-fade-in">
          {testimonials[active].text}
        </p>
        <div className="text-ink-900 text-xl mb-6 tracking-[2px]">★★★★★</div>
        <div className="text-lg font-bold text-brand-navy mb-1">{testimonials[active].name}</div>
        <div className="text-sm opacity-70">{testimonials[active].location}</div>

        <div className="flex justify-center gap-2 mt-11">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
              aria-current={i === active ? "true" : undefined}
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