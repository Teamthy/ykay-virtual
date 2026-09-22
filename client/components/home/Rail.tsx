"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Drifting programme rail under the home hero — CSS marquee card track with
 * manual arrows. Pauses on hover / focus / drag; disabled for reduced motion.
 */

const CARDS = [
  {
    n: "01",
    title: ["Junior", "Programs"],
    chips: ["JSS 1–3", "BECE track"],
    blurb: "Live online classes for JSS1–JSS3, built on the NERDC scheme of work.",
    img: "/home/ykay-students.png",
    href: "/online-classes",
    active: true,
  },
  {
    n: "02",
    title: ["Senior", "Programs"],
    chips: ["SS 1–3", "WASSCE route"],
    blurb: "SS1–SS3 cohorts with structured WASSCE and UTME preparation.",
    img: "/home/card-ss.jpg",
    href: "/programmes",
    active: false,
  },
  {
    n: "03",
    title: ["Exam", "Preparation"],
    chips: ["UTME", "WAEC · NECO"],
    blurb: "Timed practice and coaching for UTME, WAEC and NECO sittings.",
    img: "/home/card-exam.jpg",
    href: "/exam-prep",
    active: false,
  },
  {
    n: "04",
    title: ["Private", "Lessons"],
    chips: ["Any age", "1-on-1"],
    blurb: "Personal tuition matched to your level, pace and schedule.",
    img: "/home/card-tuition.jpg",
    href: "/private-tuition",
    active: false,
  },
  {
    n: "05",
    title: ["CBT", "Practice"],
    chips: ["Timed", "Past papers"],
    blurb: "Exam-hall simulations with instant scoring and explanations.",
    img: "/home/card-cbt.jpg",
    href: "/login?next=/lms/practice",
    active: false,
  },
  {
    n: "06",
    title: ["Home", "Tutoring"],
    chips: ["At home", "Vetted tutors"],
    blurb: "Vetted tutors matched to your child, at home or online.",
    img: "/home/card-tutoring.jpg",
    href: "/hometutors",
    active: false,
  },
  {
    n: "07",
    title: ["UTME", "2026"],
    chips: ["JAMB track", "Score boost"],
    blurb: "A structured 2026 UTME run: syllabus, mocks and weekly reviews.",
    img: "/home/card-utme.jpg",
    href: "/utme-2026",
    active: false,
  },
  {
    n: "08",
    title: ["Digital", "Skills"],
    chips: ["IT academy", "Certificates"],
    blurb: "Practical digital skills — coding, Office, and online literacy.",
    img: "/hero/digital.jpg",
    href: "/digital-skills",
    active: false,
  },
  {
    n: "09",
    title: ["Online", "Classes"],
    chips: ["Live", "Recorded"],
    blurb: "Live cohorts with recordings, assignments and progress reports.",
    img: "/hero/cohorts.jpg",
    href: "/online-classes",
    active: false,
  },
  {
    n: "10",
    title: ["British", "Curriculum"],
    chips: ["IGCSE", "A-Level"],
    blurb: "Year 7–13 British pathway with IGCSE and A-Level coaching.",
    img: "/hero/british.jpg",
    href: "/curricula/british",
    active: false,
  },
  {
    n: "11",
    title: ["Nigerian", "Curriculum"],
    chips: ["NERDC", "JSS · SSS"],
    blurb: "NERDC-aligned JSS and SSS with BECE and WASSCE routes.",
    img: "/hero/nigerian.jpg",
    href: "/curricula/nigerian",
    active: false,
  },
];

function scrollRailBy(el: HTMLDivElement | null, dir: 1 | -1) {
  if (!el) return;
  el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
}

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article
      role={ariaHidden ? undefined : "group"}
      aria-label={ariaHidden ? undefined : `${card.title[0]} ${card.title[1]}`}
      className={`relative w-[min(78vw,240px)] overflow-hidden rounded-3xl p-4 md:w-[280px] md:p-5 ${
        card.active ? "bg-primary" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                card.active ? "bg-deep-green text-primary" : "bg-peach text-deep-green"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
            card.active ? "bg-deep-green text-primary" : "bg-peach text-deep-green"
          }`}
        >
          {card.n}
        </span>
      </div>

      <h3 className="mt-4 text-[26px] font-bold leading-[1.05] tracking-[-0.01em] text-[var(--home-ink-active)] md:text-3xl">
        {card.title[0]}
        <span className="block">{card.title[1]}</span>
      </h3>
      <p
        className={`mt-2 min-h-[3.4em] text-[11px] leading-relaxed ${
          card.active ? "text-[var(--home-ink-active)]" : "text-ink-500"
        }`}
      >
        {card.blurb}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.img}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="aspect-[4/5] w-full object-cover object-top"
        />
        {ariaHidden ? (
          <span
            aria-hidden="true"
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-bold text-deep-green shadow"
          >
            Read more <ArrowRight size={11} />
          </span>
        ) : (
          <Link
            href={card.href}
            aria-label={`${card.title[0]} ${card.title[1]} — read more`}
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-bold text-deep-green shadow transition hover:bg-deep-green hover:text-primary"
          >
            Read more <ArrowRight size={11} aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

export function Rail() {
  const trackRef = useRef<HTMLDivElement>(null);

  // Pause the marquee while the track is being dragged.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const pause = () => el.classList.add("rail-marquee-paused");
    const resume = () => el.classList.remove("rail-marquee-paused");
    el.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    return () => {
      el.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  return (
    <div
      id="programmes-rail"
      aria-labelledby="programmes-rail-title"
      className="home-screen relative isolate w-full scroll-mt-[var(--home-scroll-mt,7rem)] overflow-hidden bg-[var(--color-background)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home/ribs-cream.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-top opacity-40 mix-blend-multiply"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-background)] via-[var(--color-background)]/70 to-primary-light/40" />

      <div className="relative z-10 w-full px-4 pb-12 pt-8 sm:px-5 md:px-10 md:pb-16 md:pt-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-ink-400">
              Programmes in motion
            </p>
            <h2
              id="programmes-rail-title"
              className="mt-1.5 font-display text-2xl tracking-[-0.01em] [color:var(--home-ink)] md:text-3xl"
            >
              Find your track
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => scrollRailBy(trackRef.current, -1)}
              aria-label="Scroll programmes left"
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
            >
              <ArrowRight size={14} className="rotate-180" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollRailBy(trackRef.current, 1)}
              aria-label="Scroll programmes right"
              className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
            >
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={trackRef} className="home-screen-track scrollbar-none mt-6 overflow-x-auto pb-2 md:mt-8">
          <ul
            className="flex w-max animate-rail-marquee list-none gap-4 motion-reduce:animate-none md:gap-5"
            /* half the track (11 cards) + one gap = seamless wrap, matching
               the legacy JS (dup.offsetLeft - first.offsetLeft) */
            style={{ ["--rail-shift" as string]: "calc(-50% - 0.5rem)" }}
          >
            {CARDS.map((card) => (
              <li key={card.n} className="shrink-0 snap-start">
                <Card card={card} />
              </li>
            ))}
            {CARDS.map((card) => (
              <li key={`dup-${card.n}`} aria-hidden="true" className="shrink-0 snap-start">
                <Card card={card} ariaHidden />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
