"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-text";

// Homepage hero — full-bleed editorial (reference language: madeinevolve.com).
//
// One full-viewport image stage: real photography crossfades behind a deep
// brand-green scrim so EVERY line of type keeps premium contrast (no light on
// light, ever). The headline reveals letter by letter on load; the slide
// Ken-Burns slowly; the whole content parallax-fades on scroll. Below the
// headline: indexed meta marks (01–04), manual slide control, and the trust
// row. Images are local (public/hero) — fast on Nigerian mobile data.

const SLIDES = [
  {
    label: "Home Tutoring",
    href: "/hometutors",
    img: "/hero/home-tutoring.jpg",
    alt: "Tutor helping a young student at home",
  },
  {
    label: "Live Cohorts",
    href: "/cohorts",
    img: "/hero/cohorts.jpg",
    alt: "Students in a live online class together",
  },
  {
    label: "UTME 2026",
    href: "/utme-2026",
    img: "/hero/utme.jpg",
    alt: "Student writing answers during exam preparation",
  },
  {
    label: "International",
    href: "/plus",
    img: "/hero/international.jpg",
    alt: "Graduates celebrating international success",
  },
];

const MARKS = [
  { n: "01", label: "Live online classes" },
  { n: "02", label: "1-on-1 private tuition" },
  { n: "03", label: "UTME · WAEC · IELTS prep" },
  { n: "04", label: "Parent progress reports" },
];

const DURATION = 6000;

export function HeroSplit() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.12]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((p) => (p + 1) % SLIDES.length), DURATION);
    return () => clearInterval(t);
  }, []);

  const go = (dir: 1 | -1) =>
    setActive((p) => (p + dir + SLIDES.length) % SLIDES.length);

  const slide = SLIDES[active];

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[92svh] w-full flex-col justify-end overflow-hidden bg-deep-green"
    >
      {/* ── The image stage: crossfade + slow Ken-Burns, best-fit cover ── */}
      <div className="absolute inset-0">
        {SLIDES.map((s, i) => (
          <motion.div
            key={s.img}
            initial={false}
            animate={{ opacity: i === active ? 1 : 0 }}
            transition={{ duration: 1.1, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: i === active ? 1.07 : 1 }}
              transition={{
                duration: DURATION / 1000 + 1.2,
                ease: "linear",
              }}
              style={{ originX: 0.5, originY: 0.6 }}
              className="h-full w-full"
            >
              <Image
                src={s.img}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            </motion.div>
          </motion.div>
        ))}
        {/* Deep scrim, top→bottom and edges — guarantees text contrast on
            every photograph, light or dark. */}
        <div className="absolute inset-0 bg-gradient-to-b from-deep-green/85 via-deep-green/55 to-deep-green/90" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_100%,rgba(1,57,32,0.85)_0%,transparent_60%)]" />
      </div>

      {/* ── Content ── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-end px-6 pb-10 pt-32 md:px-10 md:pb-14"
      >
        <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/25 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-primary" />
          Ykay family · Online school
        </p>

        <h1 className="font-display text-[clamp(3.25rem,11vw,10rem)] leading-[0.84] tracking-[-0.015em] text-white [container-type:inline-size]">
          <AnimatedText
            heavy
            stagger={0.035}
            text="LEARN"
            delay={0.15}
            animateOnLoad
            className="block"
          />
          <span className="block text-primary">
            <AnimatedText
              heavy
              stagger={0.035}
              text="ANYWHERE."
              delay={0.35}
              animateOnLoad
            />
          </span>
        </h1>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-base leading-relaxed text-white/85 md:text-lg">
              Live online classes, private 1-on-1 tuition and UTME / WAEC / IELTS
              preparation — with the same teachers and standards as the campus school,
              on any device, anywhere in Nigeria.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/programmes"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
              >
                Find a programme <ArrowRight size={14} />
              </a>
              <a
                href="/private-tuition"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:bg-white/20 active:scale-[0.97]"
              >
                Book private tuition
              </a>
            </div>
          </div>

          {/* Indexed meta marks — the editorial signature */}
          <ul className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:w-[34rem] lg:grid-cols-2">
            {MARKS.map((m) => (
              <li key={m.n} className="border-l border-white/25 pl-3">
                <span className="font-display text-sm tracking-widest text-primary">
                  ({m.n})
                </span>
                <p className="mt-1 text-xs font-semibold leading-snug text-white/85">
                  {m.label}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Slide control row ── */}
        <div className="mt-10 flex items-center justify-between border-t border-white/15 pt-5">
          <a
            href={slide.href}
            className="group inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-white"
          >
            <span className="tabular-nums text-primary">
              {String(active + 1).padStart(2, "0")}/{String(SLIDES.length).padStart(2, "0")}
            </span>
            <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-white/60">
              {slide.label}
            </span>
            <ArrowRight
              size={12}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous slide"
              className="grid size-9 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-white/60 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next slide"
              className="grid size-9 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-white/60 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
