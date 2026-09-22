import { ArrowRight, CalendarClock, GraduationCap, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

/**
 * Homepage hero — full-viewport intro (100svh): image background, glass
 * (translucent, backdrop-blur) programme cards floating over it in
 * continuous motion, then the drifting service-card rail. Edge to edge.
 * Motion is disabled for users who prefer reduced motion.
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

/** Compact chip content for narrow screens (floating chips need width). */
const EXTENDED_CHIPS = [
  {
    key: "backed",
    label: "Institution",
    label: "Institution",
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
        <CalendarClock size={15} />
      </span>
    ),
    title: "Next live class",
    sub: "Further Maths · Today 4pm",
  },
  {
    key: "escrow",
    label: "Payment protection",
    label: "Payment protection",
    icon: (
      <span className="grid size-8 place-items-center rounded-full bg-primary text-deep-green">
        <ShieldCheck size={15} />
      </span>
    ),
    title: "Escrow-protected payments",
    sub: "Tutors vetted in stages",
  },
];

/** Floating glass chips — trust / product signals over the stage. */
const CHIPS = [
  {
    key: "backed",
    label: "Institution",
    label: "Institution",
    pos: "left-[3%] top-[26%]",
    edge: "left-[3.5%] top-[46%]",
    floatCls: "motion-reduce:animate-none",
    body: (
      <div className="flex items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-chip-soft backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" className="size-8 rounded-lg object-contain" />
        <p className="text-[11px] font-bold leading-[1.25] [color:var(--home-ink)]">
          Powered by
          <span className="block [color:var(--home-ink)]">Ykay College</span>
        </p>
      </div>
    ),
  },
  {
    key: "wallet",
    label: "Next live class",
    label: "Next live class",
    pos: "right-[3%] top-[30%]",
    edge: "right-[3.5%] top-[42%]",
    floatCls: "animate-hero-float-slow",
    body: (
      <div className="w-[200px] rounded-2xl border border-black/5 bg-white p-3.5 shadow-chip backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold [color:var(--home-ink-muted)]">Next live class</p>
          <span className="flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[9px] font-bold text-deep-green">
            <CalendarClock size={10} /> Today · 4pm
          </span>
        </div>
        <p className="mt-2 font-display text-[22px] leading-none tracking-[-0.01em] [color:var(--home-ink)]">
          Further Maths
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[10px] [color:var(--home-ink-muted)]">
          <GraduationCap size={12} className="text-deep-green" />
          Mr. Adeyemi · SS2 cohort
        </p>
        <div className="mt-3 flex items-center gap-3 border-t border-black/5 pt-2.5 text-[10px] font-bold">
          <Link
            href="/login?next=/lms"
            className="inline-flex items-center gap-1 rounded-sm text-deep-green hover:underline focus-visible:outline-2"
          >
            <PlayCircle size={12} /> Join class
          </Link>
          <Link
            href="/programmes"
            className="rounded-sm text-ink-400 hover:[color:var(--home-ink)] focus-visible:outline-2"
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
    label: "Payment protection",
    pos: "left-[7%] bottom-[12%]",
    edge: "left-[8%] bottom-[13%]",
    floatCls: "animate-hero-float [animation-delay:0.6s]",
    body: (
      <div className="flex items-center gap-2.5 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-chip-soft backdrop-blur">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-deep-green">
          <ShieldCheck size={16} />
        </span>
        <div>
          <p className="flex items-center gap-1 text-[10px] font-bold tracking-[0.16em] text-warning">
            <Sparkles size={10} className="fill-[#F4B400] text-warning" />
            TRUST
          </p>
          <p className="text-[11px] font-bold leading-[1.25] [color:var(--home-ink)]">
            Escrow-protected
            <span className="block [color:var(--home-ink)]">payments</span>
          </p>
        </div>
      </div>
    ),
  },
];

function Chip({ chip }: { chip: (typeof CHIPS)[number] }) {
  return (
    <div
      role="group"
      aria-label={chip.label}
      className="animate-hero-in-2 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:animate-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
    >
      <div className={`animate-hero-float motion-reduce:animate-none ${chip.floatCls}`}>{chip.body}</div>
    </div>
  );
}

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article
      aria-hidden={ariaHidden || undefined}
      className={`relative w-[min(78vw,240px)] shrink-0 snap-start overflow-hidden rounded-3xl p-4 md:w-[280px] md:p-5 ${
        card.active ? "bg-deep-green" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                card.active ? "bg-primary text-deep-green" : "bg-primary-light text-deep-green"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
            card.active ? "bg-primary text-deep-green" : "bg-primary-light text-deep-green"
          }`}
        >
          {card.n}
        </span>
      </div>

      <h2
        className={`mt-4 text-[26px] font-bold leading-[1.05] tracking-[-0.01em] [color:var(--home-ink)] md:text-3xl ${
          card.active ? "text-primary" : ""
        }`}
      >
        {card.title[0]}
        <span className="block">{card.title[1]}</span>
      </h2>
      <p className={`mt-2 min-h-[3.4em] text-[11px] leading-relaxed ${card.active ? "text-white/70" : "text-ink-600"}`}>
        {card.blurb}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.img}
          alt={card.alt}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover object-top"
        />
        <Link
          href={card.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[10px] font-bold text-deep-green shadow transition hover:bg-deep-green hover:text-primary"
        >
          Read More <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  );
}

export function HomeHero() {
  return (
    <div className="animate-hero-in-2 transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02] motion-reduce:animate-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100">
      <div className={`animate-hero-float motion-reduce:animate-none ${chip.floatCls}`}>{chip.body}</div>
    </div>
  );
}

function Card({ card, ariaHidden }: { card: (typeof CARDS)[number]; ariaHidden?: boolean }) {
  return (
    <article
      aria-hidden={ariaHidden || undefined}
      className={`relative w-[min(78vw,240px)] shrink-0 snap-start overflow-hidden rounded-3xl p-4 md:w-[280px] md:p-5 ${
        card.active ? "bg-deep-green" : "bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {card.chips.map((chip) => (
            <span
              key={chip}
              className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
                card.active ? "bg-primary text-deep-green" : "bg-primary-light text-deep-green"
              }`}
            >
              {chip}
            </span>
          ))}
        </div>
        <span
          aria-hidden="true"
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
            card.active ? "bg-primary text-deep-green" : "bg-primary-light text-deep-green"
          }`}
        >
          {card.n}
        </span>
      </div>

      <h2
        className={`mt-4 text-[26px] font-bold leading-[1.05] tracking-[-0.01em] [color:var(--home-ink)] md:text-3xl ${
          card.active ? "text-primary" : ""
        }`}
      >
        {card.title[0]}
        <span className="block">{card.title[1]}</span>
      </h2>
      <p className={`mt-2 min-h-[3.4em] text-[11px] leading-relaxed ${card.active ? "text-white/70" : "text-ink-600"}`}>
        {card.blurb}
      </p>

      <div className="relative mt-4 overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.img}
          alt={card.alt}
          loading="lazy"
          className="aspect-[4/5] w-full object-cover object-top"
        />
        <Link
          href={card.href}
          tabIndex={ariaHidden ? -1 : undefined}
          className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[10px] font-bold text-deep-green shadow transition hover:bg-deep-green hover:text-primary"
        >
          Read More <ArrowRight size={11} />
        </Link>
      </div>
    </article>
  );
}

export function HomeHero() {
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
    <section className="w-full max-w-[100vw] overflow-x-clip">
      <div className="relative isolate overflow-hidden bg-[var(--color-background)]">
        {/* faint architectural grid */}
        <div
          aria-hidden="true"
          className="home-grid pointer-events-none absolute inset-0"
        />

        {/* lime glow + cut-out learner (wide: overlapped by the copy block) */}
        <div
          aria-hidden="true"
          aria-hidden="true"
          className="relative z-[5] mx-auto -mt-32 h-[min(96vw,560px)] w-full max-w-[1500px] sm:-mt-44 lg:-mt-64 xl:-mt-24 xl:h-[660px]"
        >
          <div
            aria-hidden="true"
            className="home-glow animate-scale-in motion-reduce:animate-none absolute left-[42%] top-[6%] aspect-square w-[min(58vw,480px)] -translate-x-1/2 rounded-full xl:left-[28%] xl:w-[min(34vw,560px)]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/home/hero-student.png"
            alt="Smiling student with a backpack holding a tablet and books"
            className="animate-hero-in-late motion-reduce:animate-none absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 object-contain object-left max-sm:hidden xl:left-[27%] xl:h-[97%]"
          />

          {/* floating chips */}
          <div className="pointer-events-none absolute inset-0 z-10">
            {CHIPS.map((chip) => (
              <div
                key={chip.key}
                className={`pointer-events-auto absolute hidden sm:block lg:hidden ${chip.pos}`}
              >
                <Chip chip={chip} />
              </div>
            ))}
          </div>
        </div>

        {/* sm–lg: stacked stage (copy above, portrait below, chips in ring) */}
        <div className="relative z-20 mx-auto -mt-28 flex w-full max-w-3xl flex-col items-center px-4 pb-14 text-center sm:-mt-36 sm:px-6 lg:hidden">
          <p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text animate-hero-in inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary-light px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-deep-green motion-reduce:animate-none"
          >
            <Sparkles size={11} className="fill-primary-dark text-primary-dark" />
            Live · Vetted · Personal
          </p>

          <h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text animate-hero-in-late mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.98] tracking-[-0.02em] [color:var(--home-ink)] motion-reduce:animate-none"
          >
            Comprehensive Learning
            <span className="block">Solutions for Every Student</span>
          </h1>

          <p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="hero-text animate-hero-in-2 mt-5 max-w-xl text-sm leading-relaxed text-ink-600 motion-reduce:animate-none md:text-base xl:max-w-[560px]"
          >
            The easiest and fastest way to learn with expert tutors — British and
            Nigerian curricula, exam preparation, private tuition and live cohorts
            for students worldwide.
          </p>

          <div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="animate-hero-in-2 mt-8 flex w-full max-w-md flex-col items-stretch gap-3 motion-reduce:animate-none sm:mt-9 sm:max-w-none sm:flex-row sm:items-center sm:justify-center"
          >
            <Link
              href="/hometutors#booking"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-deep-green shadow-brand-lg transition hover:bg-primary-hover"
            >
              Book a Home Tutor
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/programmes"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-8 py-3.5 text-sm font-bold [color:var(--home-ink)] transition hover:border-ink-300 hover:bg-ink-50"
            >
              View programmes
              <PlayCircle size={15} className="text-ink-600" />
            </Link>
          </div>

          {/* trust row */}
          <div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="animate-hero-in-3 mt-5 flex items-center justify-center gap-2.5 motion-reduce:animate-none sm:mt-6"
          >
            <div className="flex -space-x-2.5">
              {["/tutors/tutor-1.jpg", "/tutors/tutor-2.jpg", "/tutors/tutor-3.jpg"].map((src) => (
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
              <span className="[color:var(--home-ink)]">Vetted</span> tutors for
              escrow-protected tuition
            </p>
          </div>

          {/* xs: chip content as a compact strip (no room to float) */}
          <ul className="animate-hero-in-3 mt-7 grid w-full max-w-sm list-none grid-cols-1 gap-2 text-left motion-reduce:animate-none sm:hidden">
            {EXTENDED_CHIPS.map((c) => (
              <li
                key={c.key}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 shadow-chip-soft backdrop-blur"
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
            <p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="hero-text animate-hero-in inline-flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary-light px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-deep-green motion-reduce:animate-none"
            >
              <Sparkles size={11} className="fill-primary-dark text-primary-dark" />
              Live · Vetted · Personal
            </p>
            <h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="hero-text animate-hero-in-late mt-5 max-w-[18ch] font-display text-[clamp(2.4rem,7vw,6.5rem)] leading-[0.98] tracking-[-0.02em] [color:var(--home-ink)] motion-reduce:animate-none"
            >
              Comprehensive Learning
              <span className="block">Solutions for Every Student</span>
            </h1>
            <p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="hero-text animate-hero-in-2 mt-5 max-w-xl text-sm leading-relaxed text-ink-600 motion-reduce:animate-none md:text-base xl:max-w-[560px]"
            >
              The easiest and fastest way to learn with expert tutors — British and
              Nigerian curricula, exam preparation, private tuition and live cohorts
              for students worldwide.
            </p>
            <div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="animate-hero-in-2 mt-8 flex items-center justify-center gap-3 motion-reduce:animate-none"
            >
              <Link
                href="/hometutors#booking"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-deep-green shadow-brand-lg transition hover:bg-primary-hover"
              >
                Book a Home Tutor
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/programmes"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-200 bg-white px-8 py-3.5 text-sm font-bold [color:var(--home-ink)] transition hover:border-ink-300 hover:bg-ink-50"
              >
                View programmes
                <PlayCircle size={15} className="text-ink-600" />
              </Link>
            </div>
            <div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="animate-hero-in-3 mt-5 flex items-center justify-center gap-2.5 motion-reduce:animate-none"
            >
              <div className="flex -space-x-2">
                {["/tutors/tutor-1.jpg", "/tutors/tutor-2.jpg", "/tutors/tutor-3.jpg"].map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className="size-7 rounded-full border-2 border-white bg-ink-100 object-cover"
                  />
                ))}
              </div>
              <p className="text-[11px] font-semibold [color:var(--home-ink-muted)]">
                <span className="[color:var(--home-ink)]">Vetted</span> tutors for
                escrow-protected tuition
              </p>
            </div>
          </div>

          {/* chips pinned to the stage edges (no text collision) */}
          {CHIPS.map((chip) => (
            <div
              key={chip.key}
              className={`pointer-events-auto absolute hidden xl:block ${chip.edge}`}
            >
              <Chip chip={chip} />
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Programme rail                                              */}
      {/* ---------------------------------------------------------- */}
      <div id="programmes-rail" className="home-screen relative isolate w-full scroll-mt-[var(--home-scroll-mt,7rem)] overflow-hidden bg-[var(--color-background)]">
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
              <p className="mt-1.5 font-display text-2xl tracking-[-0.01em] [color:var(--home-ink)] md:text-3xl">
                Find your track
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-1">
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
            className="home-screen-track scrollbar-none mt-6 flex snap-x gap-4 overflow-x-auto pb-2 md:mt-8 md:gap-5"
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
