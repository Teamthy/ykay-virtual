"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// ProgrammeMarquee — the hero's discovery system. Replaces the old flat
// image reel with tall, editorial programme cards that drift continuously
// (a seamless translateX loop — no snap, no visible reset). Every card is a
// real offering on a real route: the marquee answers "what can I learn
// here?" while the photography carries the colour. Animation is pure CSS
// (GPU transform), pauses on hover, and is switched off entirely under
// prefers-reduced-motion by the global guard in globals.css.

type Programme = {
  category: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  href: string;
  /** editorial stagger — alternating cards sit lower */
  drop?: boolean;
  /** per-card crop so eight photos don't all centre the same way */
  position?: string;
};

const PROGRAMMES: Programme[] = [
  {
    category: "At home",
    title: "Home Tutoring",
    description: "Vetted teachers come to you — primary through SS3.",
    image: "/hero/home-tutoring.jpg",
    alt: "Tutor helping a young student with schoolwork at home",
    href: "/hometutors",
    position: "object-[50%_30%]",
  },
  {
    category: "Exam preparation",
    title: "UTME 2026",
    description: "Live classes, recordings and CBT-style mocks.",
    image: "/hero/utme.jpg",
    alt: "Student writing during UTME exam preparation",
    href: "/utme-2026",
    drop: true,
  },
  {
    category: "Learn together",
    title: "Live Cohorts",
    description: "Small-group classes with a real timetable.",
    image: "/hero/cohorts.jpg",
    alt: "Students in a live online class",
    href: "/cohorts",
  },
  {
    category: "1-on-1",
    title: "Private Tuition",
    description: "One tutor, one learner, a plan that fits.",
    image: "/hero/plus.jpg",
    alt: "Tutor guiding a learner one-on-one",
    href: "/private-tuition",
    drop: true,
    position: "object-[50%_25%]",
  },
  {
    category: "Exam preparation",
    title: "Test Prep",
    description: "WAEC, NECO, IELTS and SAT, taught to the syllabus.",
    image: "/hero/test-prep.jpg",
    alt: "Student taking study notes",
    href: "/exam-prep",
  },
  {
    category: "International",
    title: "British Curriculum",
    description: "Checkpoint, IGCSE and Edexcel paths, anywhere.",
    image: "/hero/international.jpg",
    alt: "Graduates celebrating their results",
    href: "/curricula/british",
    drop: true,
  },
  {
    category: "Membership",
    title: "YK-Virtual Plus",
    description: "Priority matching, discounts and study tools.",
    image: "/hero/african-student.jpg",
    alt: "Student smiling with learning materials",
    href: "/plus",
    position: "object-[50%_20%]",
  },
  {
    category: "School placement",
    title: "Entrance Exams",
    description: "Prep for Nigeria's top secondary school tests.",
    image: "/hero/entrance-exam.jpg",
    alt: "Student preparing for an entrance examination",
    href: "/entrance-exam",
    drop: true,
  },
];

function ProgrammeCard({ p, i }: { p: Programme; i: number }) {
  return (
    <Link
      href={p.href}
      className={`group/card relative flex w-[228px] shrink-0 flex-col overflow-hidden rounded-[22px] border border-ink-100 bg-white shadow-soft transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06] sm:w-[248px] lg:w-[264px] ${
        p.drop ? "md:mt-7" : ""
      }`}
      aria-label={`${p.title} — ${p.category}`}
    >
      {/* copy zone */}
      <div className="flex min-h-[9.5rem] flex-col px-5 pb-4 pt-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-deep dark:text-primary">
          {p.category}
        </p>
        <h3 className="mt-2 font-display text-[1.35rem] leading-tight text-ink-950 dark:text-white">
          {p.title}
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500 dark:text-white/70">
          {p.description}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-deep-green transition-colors group-hover/card:text-brand-green dark:text-primary">
          Explore
          <ArrowUpRight
            size={13}
            className="transition-transform duration-500 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5"
          />
        </span>
      </div>
      {/* image zone */}
      <div className="relative h-[13rem] w-full overflow-hidden md:h-[14.5rem]">
        <Image
          src={p.image}
          alt={p.alt}
          fill
          sizes="(max-width: 640px) 228px, 264px"
          priority={i < 3}
          className={`object-cover transition-transform duration-700 ease-out group-hover/card:scale-[1.04] ${p.position ?? "object-center"}`}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/10 to-transparent opacity-0" />
      </div>
    </Link>
  );
}

export function ProgrammeMarquee() {
  // Duplicated once for the seamless -50% translate loop; the track is
  // w-max inside an overflow-hidden viewport so the page never scrolls sideways.
  const loop = [...PROGRAMMES, ...PROGRAMMES];
  return (
    <div className="relative w-full pb-14 pt-2">
      <div
        className="group relative flex w-full overflow-hidden"
        aria-label="Programmes and services — continuously scrolling"
      >
        <div className="animate-[hero-reel_64s_linear_infinite] flex w-max items-start gap-4 pl-4 group-hover:[animation-play-state:paused] md:gap-5 md:pl-6">
          {loop.map((p, i) => (
            <ProgrammeCard key={`${p.href}-${i}`} p={p} i={i} />
          ))}
        </div>
        {/* barely-there edge fades so cards feel like they enter/leave */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-peach to-transparent dark:from-deep-green" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-peach to-transparent dark:from-deep-green" />
      </div>
    </div>
  );
}
