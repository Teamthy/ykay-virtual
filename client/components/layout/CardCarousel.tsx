"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// CardCarousel — industry-standard horizontal scroll-snap rail for cards
// (tracks, testimonials, programmes). Arrows scroll by one card; touch/mouse
// swiping works natively via scroll-snap. Renders children as slides.

export function CardCarousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: number) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const w = card ? card.offsetWidth + 16 : 300;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className="scroll-smooth overflow-x-auto pb-2 scrollbar-none"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex gap-4">{children}</div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          aria-label="Scroll left"
          onClick={() => scrollByCard(-1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-[#0F2A1A]/70 transition-colors hover:border-[#D6FF57] hover:bg-[#D6FF57] hover:text-[#0F2A1A]"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          aria-label="Scroll right"
          onClick={() => scrollByCard(1)}
          className="grid h-9 w-9 place-items-center rounded-full border border-black/10 text-[#0F2A1A]/70 transition-colors hover:border-[#D6FF57] hover:bg-[#D6FF57] hover:text-[#0F2A1A]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
