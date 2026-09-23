"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* eslint-disable @next/next/no-img-element */

/**
 * Hero learner carousel — the female student cut-out becomes the first slide
 * of a rotating stage of learners, tutors and parents inside the hero circle.
 *
 * Behaviour:
 *  - auto-advances every 4.5s; pauses on hover/focus (and pointer capture)
 *  - fully manual under `prefers-reduced-motion` (no auto-advance, no slide
 *    transition) — dots and arrows stay usable
 *  - the circle keeps its intentional `#D9F1C6` pastel-green surface (an
 *    exception to the lime accent palette, per the reference redesign)
 */

type Slide = {
  src: string;
  label: string;
  /** object-position for photo crops */
  position?: string;
  /** cut-out PNG on a white background — multiplied into the circle */
  cutout?: boolean;
};

const SLIDES: Slide[] = [
  {
    src: "/home/hero-student.png",
    label: "YK-Virtual learner holding books and a tablet",
    position: "50% 0%",
    cutout: true,
  },
  {
    src: "/hero/african-student.jpg",
    label: "Student checking a YK-Virtual lesson on her phone",
    position: "50% 22%",
  },
  {
    src: "/tutors/chinasa.jpg",
    label: "Vetted YK-Virtual tutor",
    position: "50% 30%",
  },
  {
    src: "/hero/student-learning.jpg",
    label: "Student revising with a laptop and a notebook",
    position: "58% 32%",
  },
  {
    src: "/tutors/judith.jpg",
    label: "Vetted YK-Virtual tutor",
    position: "50% 30%",
  },
  {
    src: "/home/identity-learner.jpg",
    label: "Learner studying at a home desk",
    position: "52% 35%",
  },
];

const INTERVAL_MS = 4500;

export function HeroLearnerCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = SLIDES.length;

  // Track reduced-motion preference live so the carousel responds to
  // OS-level changes without a reload.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const go = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count],
  );

  // Auto-advance: only when not paused, not reduced-motion.
  useEffect(() => {
    if (paused || reduced) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, [paused, reduced, count]);

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Learners, tutors and parents on YK-Virtual"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
    >
      {/* ── Stage: the hero circle (geometry unchanged from the reference) ── */}
      <div className="relative z-[5] mx-auto mt-10 h-[min(72vw,380px)] w-full max-w-[1200px] overflow-hidden sm:h-[min(52vw,480px)] lg:h-[min(42vw,560px)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 aspect-square w-[min(88vw,420px)] -translate-x-1/2 overflow-hidden rounded-full bg-[#D9F1C6] ring-1 ring-[#0F2A1A]/10 sm:w-[min(62vw,560px)] lg:w-[min(52vw,720px)]"
        >
          <div className="flex h-full transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
            {SLIDES.map((s, i) => (
              <div
                key={s.src}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${s.label}`}
                aria-hidden={i !== index}
                className="h-full w-full flex-none overflow-hidden rounded-full"
              >
                <img
                  src={s.src}
                  alt={i === index ? s.label : ""}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className={`h-full w-full ${
                    s.cutout
                      ? "object-contain object-top mix-blend-multiply"
                      : "object-cover"
                  }`}
                  style={s.cutout ? undefined : { objectPosition: s.position }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Controls: prev · dots · next ── */}
      <div className="relative z-10 mx-auto mt-5 flex w-full max-w-[1200px] items-center justify-center gap-3 sm:mt-6">
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous person"
          className="grid size-9 place-items-center rounded-full border border-black/10 bg-white text-[#0F2A1A] shadow-sm transition hover:bg-[#0F2A1A] hover:text-white"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 shadow-sm" aria-label="Choose image">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-current={i === index ? "true" : undefined}
              aria-label={`Show image ${i + 1} of ${count}: ${s.label}`}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-6 bg-[#0F2A1A]"
                  : "w-1.5 bg-[#0F2A1A]/25 hover:bg-[#0F2A1A]/50"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next person"
          className="grid size-9 place-items-center rounded-full bg-[#0F2A1A] text-white shadow-sm transition hover:bg-black"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
