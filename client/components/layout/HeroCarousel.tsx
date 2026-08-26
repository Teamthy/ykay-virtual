"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// HeroCarousel — industry-standard full-bleed rotating hero. Each slide paints
// a background image under a navy scrim so white copy stays legible; it auto-
// advances and supports manual dots + arrows. Bundled local hero photos only
// (preview has no network), matching the PageHero convention.

export type HeroSlide = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cover: string;
  ctas?: { label: string; href: string; primary?: boolean }[];
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return;
    const t = setInterval(() => setActive((p) => (p + 1) % n), 6500);
    return () => clearInterval(t);
  }, [n]);

  const go = (i: number) => setActive(((i % n) + n) % n);

  if (n === 0) return null;
  const s = slides[active];

  return (
    <section className="relative overflow-hidden bg-deep">
      {/* Background image per slide */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.82) 0%, rgba(6,15,38,0.9) 100%), url("${s.cover}")` }}
        aria-hidden="true"
      />

      {/* Slide content */}
      <div className="container-x relative z-10 py-24 md:py-28 text-center text-white">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-gold">
          {s.eyebrow}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl tracking-[0.02em] md:text-5xl">
          {s.title}
        </h1>
        {s.subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">{s.subtitle}</p>
        )}
        {s.ctas && s.ctas.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {s.ctas.map((c) =>
              c.primary ? (
                <Link key={c.href} href={c.href} className="btn-gold">
                  {c.label}
                </Link>
              ) : (
                <Link
                  key={c.href}
                  href={c.href}
                  className="rounded-full border border-white/40 px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
                >
                  {c.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>

      {/* Dots */}
      {n > 1 && (
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "h-2.5 rounded-full transition-all",
                i === active ? "w-7 bg-brand-gold" : "w-2.5 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {n > 1 && (
        <>
          <button
            aria-label="Previous slide"
            onClick={() => go(active - 1)}
            className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-3 text-white transition-colors hover:bg-black/60 md:flex"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Next slide"
            onClick={() => go(active + 1)}
            className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-3 text-white transition-colors hover:bg-black/60 md:flex"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </section>
  );
}
