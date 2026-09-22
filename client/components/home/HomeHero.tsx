import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  GraduationCap,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/**
 * Homepage hero — light editorial stage on a faint grid: centred badge →
 * headline → subtext → CTA pair → trust row, with a lime glow, a cut-out
 * learner and three floating glass chips (institution · next live class ·
 * escrow). Entrance motion honours prefers-reduced-motion.
 *
 * Layout ladder:
 *   xs     stacked copy + compact chips strip (no floating chips)
 *   sm–md  stacked copy overlapping the portrait, chips in a ring
 *   lg+    editorial overlap (copy over the portrait, halo'd type),
 *          chips pinned to the stage edges
 */

const AVATARS = [
  "/tutors/adewale.jpg",
  "/tutors/chinasa.jpg",
  "/tutors/demilola.jpg",
];

/** Compact chip content for narrow screens (floating chips need width). */
const EXTENDED_CHIPS = [
  {
    key: "backed",
    icon: (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/brand/mark.png" alt="" className="size-8 rounded-lg object-contain" />
    ),
    title: "Powered by",
    sub: "Ykay College",
  },
  {
    key: "live",
    icon: (
      <span className="grid size-8 place-items-center rounded-full bg-primary text-deep-green">
        <CalendarClock size={15} aria-hidden="true" />
      </span>
    ),
    title: "Next live class",
    sub: "Vetted tutor · Live online",
  },
  {
    key: "escrow",
    icon: (
      <span className="grid size-8 place-items-center rounded-full bg-primary text-deep-green">
        <ShieldCheck size={15} aria-hidden="true" />
      </span>
    ),
    title: "Escrow-protected payments",
    sub: "Tutors vetted in stages",
  },
];

type ChipSpec = {
  key: string;
  label: string;
  /** ring position around the portrait (sm–md) */
  pos: string;
  /** stage-edge position (lg+) */
  edge: string;
  floatCls: string;
  body: ReactNode;
};

/** Floating glass chips — trust / product signals over the stage. */
const CHIPS: ChipSpec[] = [
  {
    key: "backed",
    label: "Institution",
    pos: "left-[3%] top-[26%]",
    edge: "left-[3.5%] top-[46%]",
    floatCls: "animate-hero-float motion-reduce:animate-none",
    body: (
      <div className="home-chip home-chip--round flex items-center gap-2.5 px-3.5 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" className="size-8 rounded-lg object-contain" />
        <p className="text-[11px] font-bold leading-[1.25] [color:var(--home-ink)]">
          Powered by
          <span className="block">Ykay College</span>
        </p>
      </div>
    ),
  },
  {
    key: "live-class",
    label: "Next live class",
    pos: "right-[3%] top-[30%]",
    edge: "right-[3.5%] top-[42%]",
    floatCls: "animate-hero-float-slow motion-reduce:animate-none",
    body: (
      <div className="home-chip home-chip--lg home-chip--round w-[200px] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold [color:var(--home-ink-muted)]">Next live class</p>
          <span className="flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[9px] font-bold text-deep-green">
            <CalendarClock size={10} aria-hidden="true" /> Today
          </span>
        </div>
        <p className="mt-2 font-display text-[22px] leading-none tracking-[-0.01em] [color:var(--home-ink)]">
          Live class today
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] [color:var(--home-ink-muted)]">
          <GraduationCap size={12} className="text-deep-green" aria-hidden="true" />
          Vetted tutor · Your cohort
        </p>
        <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-2.5 text-[10px] font-bold">
          <Link
            href="/login?next=/lms"
            className="inline-flex items-center gap-1 rounded-sm text-deep-green hover:underline"
          >
            <PlayCircle size={12} aria-hidden="true" /> Join class
          </Link>
          <Link
            href="/#programmes"
            className="rounded-sm [color:var(--home-ink-muted)] hover:[color:var(--home-ink)]"
          >
            Reschedule
          </Link>
          <span aria-hidden="true" className="ml-auto tracking-[0.15em] text-ink-300">
            •••
          </span>
        </div>
      </div>
    ),
  },
  {
    key: "escrow",
    label: "Payment protection",
    pos: "left-[7%] bottom-[12%]",
    edge: "left-[8%] bottom-[13%]",
    floatCls: "animate-hero-float [animation-delay:0.6s] motion-reduce:animate-none",
    body: (
      <div className="home-chip home-chip--round flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-deep-green">
          <ShieldCheck size={16} aria-hidden="true" />
        </span>
        <div>
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-deep-green">
            Trust
          </span>
          <p className="mt-1 text-[11px] font-bold leading-[1.25] [color:var(--home-ink)]">
            Escrow-protected
            <span className="block">payments</span>
          </p>
        </div>
      </div>
    ),
  },
];

function ChipCard({ chip }: { chip: ChipSpec }) {
  return (
    <div
      role="group"
      aria-label={chip.label}
      className="hero-anim hero-anim--2 motion-reduce:animate-none"
    >
      <div className={chip.floatCls}>{chip.body}</div>
    </div>
  );
}

function HeroBadge() {
  return (
    <p className="hero-text hero-anim inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary-light px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-deep-green motion-reduce:animate-none">
      <Sparkles size={11} className="fill-primary-dark text-primary-dark" aria-hidden="true" />
      Live · Vetted · Personal
    </p>
  );
}

function HeroHeadline() {
  return (
    <h1 className="hero-text hero-anim hero-anim--1 mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.98] tracking-[-0.02em] [color:var(--home-ink)] motion-reduce:animate-none">
      Comprehensive Learning
      <span className="block">Solutions for Every Student</span>
    </h1>
  );
}

function HeroSub() {
  return (
    <p className="hero-text hero-anim hero-anim--2 mt-5 max-w-xl text-sm leading-relaxed text-ink-600 motion-reduce:animate-none md:text-base xl:max-w-[560px]">
      The easiest and fastest way to learn with expert tutors — British and Nigerian
      curricula, exam preparation, private tuition and live cohorts for students worldwide.
    </p>
  );
}

function HeroCtas({ rowClass }: { rowClass: string }) {
  return (
    <div className={`hero-anim hero-anim--2 motion-reduce:animate-none ${rowClass}`}>
      <Link
        href="/hometutors#booking"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-deep-green shadow-brand-lg transition hover:bg-primary-hover"
      >
        Book a Home Tutor
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
      <Link
        href="/#programmes"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-8 py-3.5 text-sm font-bold [color:var(--home-ink)] transition hover:border-ink-300 hover:bg-ink-50"
      >
        View programmes
        <PlayCircle size={15} className="text-ink-600" aria-hidden="true" />
      </Link>
    </div>
  );
}

function HeroTrust() {
  return (
    <div className="hero-anim hero-anim--3 mt-5 flex items-center justify-center gap-2.5 motion-reduce:animate-none sm:mt-6">
      <div className="flex -space-x-2">
        {AVATARS.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="size-7 rounded-full border-2 border-white bg-ink-100 object-cover"
          />
        ))}
      </div>
      <p className="text-[11px] font-semibold [color:var(--home-ink-muted)]">
        <span className="[color:var(--home-ink)]">Vetted</span> tutors for escrow-protected
        tuition
      </p>
    </div>
  );
}

export function HomeHero() {
  return (
    <div className="relative isolate overflow-hidden bg-[var(--color-background)]">
      {/* faint architectural grid */}
      <div aria-hidden="true" className="home-grid pointer-events-none absolute inset-0" />

      {/* lime glow + cut-out learner (decorative) */}
      <div
        aria-hidden="true"
        className="relative z-[5] mx-auto -mt-32 h-[min(96vw,560px)] w-full max-w-[1500px] sm:-mt-44 lg:-mt-64 xl:-mt-24 xl:h-[660px]"
      >
        <div className="absolute left-[42%] top-[6%] aspect-square w-[min(58vw,480px)] -translate-x-1/2 rounded-full xl:left-[28%] xl:w-[min(34vw,560px)]">
          <div className="home-glow hero-anim h-full w-full rounded-full motion-reduce:animate-none" />
        </div>
        <div className="absolute bottom-0 left-1/2 flex h-full -translate-x-1/2 items-end max-sm:hidden xl:left-[27%] xl:h-[97%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/hero-student.png"
            alt=""
            className="hero-anim hero-anim--1 h-full w-auto max-w-none object-contain object-left mix-blend-multiply motion-reduce:animate-none"
          />
        </div>
      </div>

      {/* floating chips — ring around the portrait (sm–md) */}
      <div className="pointer-events-none absolute inset-0 z-20">
        {CHIPS.map((chip) => (
          <div key={chip.key} className={`pointer-events-auto absolute hidden sm:block lg:hidden ${chip.pos}`}>
            <ChipCard chip={chip} />
          </div>
        ))}
      </div>

      {/* xs–md: stacked copy overlapping the portrait */}
      <div className="relative z-20 mx-auto -mt-28 flex w-full max-w-3xl flex-col items-center px-4 pb-14 text-center sm:-mt-36 sm:px-6 lg:hidden">
        <HeroBadge />
        <HeroHeadline />
        <HeroSub />
        <HeroCtas rowClass="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center" />
        <HeroTrust />

        {/* xs: chip content as a compact strip (no room to float) */}
        <ul className="hero-anim hero-anim--3 mt-7 grid w-full max-w-sm list-none grid-cols-1 gap-2 text-left motion-reduce:animate-none sm:hidden">
          {EXTENDED_CHIPS.map((c) => (
            <li
              key={c.key}
              className="home-chip home-chip--round flex items-center gap-3 px-3.5 py-2.5"
            >
              {c.icon}
              <p className="text-[11px] font-bold leading-[1.25] [color:var(--home-ink)]">
                {c.title}
                <span className="block font-medium [color:var(--home-ink-muted)]">{c.sub}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* lg+: editorial overlap — copy over the portrait, chips at stage edges */}
      <div className="pointer-events-none absolute inset-0 z-30 hidden lg:block">
        <div className="pointer-events-auto mx-auto flex h-full w-full max-w-3xl flex-col items-center px-6 pt-14 text-center lg:pb-[24%] xl:ml-[28%] xl:max-w-[760px] xl:pb-[22%] xl:pt-20">
          <HeroBadge />
          <HeroHeadline />
          <HeroSub />
          <HeroCtas rowClass="mt-8 flex items-center justify-center gap-3" />
          <HeroTrust />
        </div>

        {/* chips pinned to the stage edges (no text collision) */}
        {CHIPS.map((chip) => (
          <div key={chip.key} className={`pointer-events-auto absolute hidden lg:block ${chip.edge}`}>
            <ChipCard chip={chip} />
          </div>
        ))}
      </div>
    </div>
  );
}
