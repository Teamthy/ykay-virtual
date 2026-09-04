"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { AnimatedText } from "@/components/ui/animated-text";
// TestimonialCarousel - presentational carousel for the consent-gated
// testimonials fetched by TestimonialSlider (server component). G5.3:
// only rows with consent_given + is_public ever reach this component.

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
    const t = setInterval(() => setActive((p) => (p + 1) % items.length), 6500);
    return () => clearInterval(t);
  }, [items.length]);

  const next = () => setActive((active + 1) % items.length);
  const prev = () => setActive((active - 1 + items.length) % items.length);
  const current = items[active];

  return (
    <section className="py-24 md:py-28 bg-brand-gold text-ink-900 text-center relative">
      {items.length > 1 && (
        <>
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
        </>
      )}

      <div className="max-w-[920px] mx-auto px-6 md:px-10">
        <div className="text-[100px] text-ink-900/15 leading-[0.6] mb-5 font-serif">
          &ldquo;
        </div>
        <AnimatedText
          as="h2"
          className="font-display mb-11 text-3xl tracking-[0.02em] text-brand-navy md:text-4xl"
          text="Parents love YK-Virtual"
        />
        <p
          key={current.id}
          className="text-lg md:text-xl leading-relaxed mb-11 text-ink-900 animate-fade-in"
        >
          {current.text}
        </p>
        <div
          className="text-ink-900 text-xl mb-6 tracking-[2px]"
          aria-hidden="true"
        >
          ★★★★★
        </div>
        <div className="text-lg font-bold text-brand-navy mb-1">
          {current.name}
        </div>
        {current.location ? (
          <div className="text-sm text-ink-700">{current.location}</div>
        ) : null}

        {items.length > 1 && (
          <div className="flex justify-center gap-2 mt-11">
            {items.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActive(i)}
                aria-label={`Show testimonial ${i + 1} of ${items.length}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  i === active ? "w-6 bg-white" : "w-2 bg-white/40",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
