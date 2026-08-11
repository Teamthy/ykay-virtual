"use client";
import { useState } from "react";
import { heroSlides } from "@/lib/site-data";
import { cn } from "@/lib/utils";

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const slide = heroSlides[active];

  return (
    <section className="container-x py-5">
      <div
        className="rounded-3xl px-8 md:px-16 py-14 md:py-16 text-white relative overflow-hidden min-h-[540px] transition-colors duration-500 grid-dots"
        style={{ background: slide.bg }}
      >
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center relative z-10">
          <div>
            <div className="tag-handwritten mb-4">{slide.tag}</div>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.12] tracking-tight mb-6">
              {slide.title}
            </h1>
            {slide.desc && (
              <p className="text-base md:text-lg leading-relaxed mb-9 opacity-95 max-w-[540px]">
                {slide.desc}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className="btn-gold">{slide.cta}</button>
              {slide.ctaSecondary && (
                <button className="px-8 py-4 rounded-lg border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-colors">
                  {slide.ctaSecondary}
                </button>
              )}
            </div>
          </div>
          <div className="relative h-[280px] lg:h-[400px] flex items-center justify-center order-first lg:order-last">
            <img
              src={slide.img}
              alt={slide.label}
              className="w-full max-w-[460px] h-[280px] lg:h-[380px] rounded-2xl object-cover shadow-hero"
            />
          </div>
        </div>

        {/* Indicators */}
        <div className="flex gap-1.5 mt-10 md:mt-12 justify-center relative z-10">
          {heroSlides.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "w-14 md:w-[70px] h-0.5 transition-colors relative cursor-pointer",
                i === active ? "bg-brand-gold" : "bg-white/25"
              )}
            >
              {i === active && (
                <span className="absolute top-3.5 left-1/2 -translate-x-1/2 text-xs text-white whitespace-nowrap font-medium">
                  {s.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}