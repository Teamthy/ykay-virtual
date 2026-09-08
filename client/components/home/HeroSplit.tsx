"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Homepage hero — PrebuiltUI-style centered intro on deep green, then the
 * drifting service cards on cream ribs. Edge to edge.
 */

const CARDS = [
  {
    n: "01",
    title: ["Junior", "Programs"],
    chips: ["JSS 1–3", "BECE track"],
    blurb: "Live online classes for JSS1–JSS3, built on the NERDC scheme of work.",
    img: "/home/ykay-students.png",
    alt: "Ykay College students in school uniform",
    href: "/online-classes",
    active: true,
  },
  {
    n: "02",
    title: ["Senior", "Programs"],
    chips: ["SS 1–3", "WASSCE route"],
    blurb: "SS1–SS3 cohorts with structured WASSCE and UTME preparation.",
    img: "/home/card-ss.jpg",
    alt: "Senior secondary student",
    href: "/programmes",
    active: false,
  },
  {
    n: "03",
    title: ["Exam", "Preparation"],
    chips: ["UTME", "WAEC · NECO"],
    blurb: "Timed practice and coaching for UTME, WAEC and NECO sittings.",
    img: "/home/card-exam.jpg",
    alt: "Student preparing for an exam",
    href: "/exam-prep",
    active: false,
  },
  {
    n: "04",
    title: ["Private", "Lessons"],
    chips: ["Any age", "1-on-1"],
    blurb: "Personal tuition matched to your level, pace and schedule.",
    img: "/home/card-tuition.jpg",
    alt: "Student with a notebook",
    href: "/private-tuition",
    active: false,
  },
  {
    n: "05",
    title: ["CBT", "Practice"],
    chips: ["Timed", "Past papers"],
    blurb: "Exam-hall simulations with instant scoring and explanations.",
    img: "/home/card-cbt.jpg",
    alt: "Student taking a computer-based test",
    href: "/login?next=/lms/practice",
    active: false,
  },
  {
    n: "07",
    title: ["Home", "Tutoring"],
    chips: ["At home", "Vetted tutors"],
    blurb: "Vetted tutors matched to your child, at home or online.",
    img: "/home/card-tutoring.jpg",
    alt: "Tutor and student working together",
    href: "/hometutors",
    active: false,
  },
  {
    n: "08",
    title: ["UTME", "2026"],
    chips: ["JAMB track", "Score boost"],
    blurb: "A structured 2026 UTME run: syllabus, mocks and weekly reviews.",
    img: "/home/card-utme.jpg",
    alt: "Senior student holding a practice paper",
    href: "/utme-2026",
    active: false,
  },
  {
    n: "09",
    title: ["Digital", "Skills"],
    chips: ["IT academy", "Certificates"],
    blurb: "Practical digital skills — coding, Office, and online literacy.",
    img: "/hero/digital.jpg",
    alt: "Student learning digital skills",
    href: "/digital-skills",
    active: false,
  },
  {
    n: "10",
    title: ["Online", "Classes"],
    chips: ["Live", "Recorded"],
    blurb: "Live cohorts with recordings, assignments and progress reports.",
    img: "/hero/cohorts.jpg",
    alt: "Students in an online class",
    href: "/online-classes",
    active: false,
  },
  {
    n: "11",
    title: ["British", "Curriculum"],
    chips: ["IGCSE", "A-Level"],
    blurb: "Year 7–13 British pathway with IGCSE and A-Level coaching.",
    img: "/hero/british.jpg",
    alt: "British curriculum learning",
    href: "/curricula/british",
    active: false,
  },
  {
    n: "12",
    title: ["Nigerian", "Curriculum"],
    chips: ["NERDC", "JSS · SSS"],
    blurb: "NERDC-aligned JSS and SSS with BECE and WASSCE routes.",
    img: "/hero/nigerian.jpg",
    alt: "Nigerian curriculum learning",
    href: "/curricula/nigerian",
    active: false,
  },
];

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article
      aria-hidden={ariaHidden || undefined}
      className={`relative w-[240px] shrink-0 snap-start overflow-hidden rounded-3xl p-4 md:w-[280px] md:p-5 ${
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

      <h2 className="mt-4 text-[26px] font-bold leading-[1.05] tracking-[-0.01em] text-deep-green md:text-3xl">
        {card.title[0]}
        <span className="block">{card.title[1]}</span>
      </h2>
      <p className="mt-2 min-h-[3.4em] text-[11px] leading-relaxed text-[#3f5249]">{card.blurb}</p>

      <div className="relative mt-4 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.img}
          alt={card.alt}
          loading="eager"
          className="aspect-[4/5] w-full object-cover object-top"
        />
        <Link
          href={card.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-bold text-deep-green shadow transition hover:bg-deep-green hover:text-primary"
        >
          Read More <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  );
}

export function HeroSplit() {
  const railRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const half = () => {
      const dup = el.children[CARDS.length] as HTMLElement | undefined;
      const first = el.children[0] as HTMLElement | undefined;
      return dup && first ? dup.offsetLeft - first.offsetLeft : el.scrollWidth / 2;
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!hoverRef.current && !el.matches(":hover") && !el.matches(":focus-within")) {
        const wrap = half();
        let next = el.scrollLeft + dt * 0.05;
        if (next >= wrap) next -= wrap;
        el.scrollLeft = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const pause = () => {
      hoverRef.current = true;
    };
    const resume = () => {
      hoverRef.current = false;
    };
    el.addEventListener("pointerdown", pause);
    window.addEventListener("pointerup", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", pause);
      window.removeEventListener("pointerup", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, []);

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.8, 640), behavior: "smooth" });
  };

  return (
    <section className="w-full">
      <div className="relative isolate w-full overflow-hidden bg-[#050505]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/ribs-green.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />

        <div className="relative z-10 mx-auto flex min-h-[72vh] w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center md:min-h-[78vh] md:py-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-white/90">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Elevate your learning
          </p>
          <h1 className="mt-7 max-w-[18ch] font-display text-[clamp(2.6rem,7vw,5.6rem)] leading-[0.95] tracking-[-0.03em] text-white">
            Comprehensive Learning for Every Student.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            British and Nigerian curricula, live cohorts, private tuition and exam
            preparation — built for Ykay College students and for learners anywhere.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black transition hover:bg-white/90"
            >
              Get started
            </Link>
            <Link
              href="/programmes"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-transparent px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              View programmes
            </Link>
          </div>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Escrow-protected tuition · Live cohorts · CBT practice
          </p>
        </div>
      </div>

      <div className="relative isolate w-full overflow-hidden bg-peach">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/ribs-cream.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF7E4]/70 via-[#FFF7E4]/40 to-[#DFFFF2]/35" />

        <div className="relative z-10 w-full px-5 pb-10 pt-8 md:px-10 md:pb-14 md:pt-10">
          <div className="flex items-end justify-between gap-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#3f5249]">
              Programmes in motion
            </p>
            <div className="hidden shrink-0 items-center gap-2 pb-1 md:flex">
              <button
                type="button"
                onClick={() => scrollRail(-1)}
                aria-label="Scroll programmes left"
                className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
              >
                <ArrowRight size={14} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => scrollRail(1)}
                aria-label="Scroll programmes right"
                className="grid h-9 w-9 place-items-center rounded-full bg-deep-green text-primary transition hover:bg-black"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div
            ref={railRef}
            className="scrollbar-none mt-6 flex gap-4 overflow-x-auto pb-2 md:mt-8 md:gap-5"
          >
            {CARDS.map((card) => (
              <Card key={card.n} card={card} />
            ))}
            {CARDS.map((card) => (
              <Card key={`dup-${card.n}`} card={card} ariaHidden />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
