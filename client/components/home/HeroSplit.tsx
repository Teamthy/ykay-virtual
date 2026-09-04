"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { ProgrammeMarquee } from "@/components/home/ProgrammeMarquee";

// Homepage hero — evolve-accurate editorial (reference: madeinevolve.com).
//
// The inspo's language: a LIGHT canvas, one enormous display headline whose
// letters introduce themselves on load and unstitch on the way out, then a
// drifting reel of image covers beneath. Ours: light peach canvas in light
// mode / deep green in dark mode, LEARN / ANYWHERE. in Anton-style caps,
// per-letter spring intro + per-letter scroll outro, and an auto-drifting
// reel of real photography (pause on hover). Type is always ink-on-light or
// white-on-deep — contrast is structural, never accidental.

const MARKS = [
  { n: "01", label: "Live online classes" },
  { n: "02", label: "1-on-1 private tuition" },
  { n: "03", label: "UTME · WAEC · IELTS prep" },
  { n: "04", label: "Parent progress reports" },
];

/** One headline letter: heavy spring intro, per-letter scroll outro. */
function HeroLetter({
  char,
  index,
  progress,
}: {
  char: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const start = 0.08 + index * 0.028;
  const y = useTransform(
    progress,
    [start, start + 0.3],
    [0, -(90 + index * 7)],
  );
  const opacity = useTransform(progress, [start, start + 0.22], [1, 0]);
  const rotate = useTransform(
    progress,
    [start, start + 0.3],
    [0, index % 2 ? 6 : -6],
  );

  if (reduce) return <span>{char}</span>;

  return (
    <motion.span style={{ display: "inline-block", y, opacity, rotate }}>
      <motion.span
        style={{ display: "inline-block", willChange: "transform" }}
        initial={{
          opacity: 0,
          y: "1.05em",
          rotate: -12,
          scale: 0.7,
          filter: "blur(8px)",
        }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1, filter: "blur(0px)" }}
        transition={{
          type: "spring",
          stiffness: 240,
          damping: 16,
          mass: 0.9,
          delay: 0.35 + index * 0.03,
        }}
      >
        {char}
      </motion.span>
    </motion.span>
  );
}

function HeroWord({
  word,
  progress,
  className,
}: {
  word: string;
  progress: MotionValue<number>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{word}</span>;
  return (
    <span className={className} aria-label={word} role="text">
      {Array.from(word).map((char, i) => (
        <HeroLetter
          key={`${char}-${i}`}
          char={char}
          index={i}
          progress={progress}
        />
      ))}
    </span>
  );
}

export function HeroSplit() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const metaY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const metaOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const reelY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={sectionRef}
      className="relative flex w-full flex-col overflow-hidden bg-peach dark:bg-deep-green"
    >
      {/* ── The headline canvas ── */}
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-10 pt-28 md:px-10 md:pt-36">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/70 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-600 dark:border-white/20 dark:bg-white/10 dark:text-white/80"
        >
          <span className="size-1.5 rounded-full bg-brand-green" />
          Ykay family · Online school
        </motion.p>

        <h1 className="font-display text-[clamp(3.5rem,12.5vw,11.5rem)] leading-[0.84] tracking-[-0.02em] text-ink-950 dark:text-white [container-type:inline-size]">
          <HeroWord
            word="LEARN"
            progress={scrollYProgress}
            className="block whitespace-nowrap"
          />
          <span className="block text-deep-green dark:text-primary">
            <HeroWord
              word="ANYWHERE."
              progress={scrollYProgress}
              className="block whitespace-nowrap"
            />
          </span>
        </h1>

        {/* Meta row: copy + CTAs + indexed marks */}
        <motion.div
          style={{ y: metaY, opacity: metaOpacity }}
          className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-xl">
            <p className="text-base leading-relaxed text-ink-600 dark:text-white/80 md:text-lg">
              Live online classes, private 1-on-1 tuition and UTME / WAEC /
              IELTS preparation — the same teachers and standards as the campus
              school, on any device, anywhere in Nigeria.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/programmes"
                className="inline-flex items-center gap-2 rounded-full bg-deep-green px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-deep-green-light active:scale-[0.97] dark:bg-primary dark:text-ink-900 dark:hover:bg-primary-hover"
              >
                Find a programme <ArrowRight size={14} />
              </a>
              <a
                href="/private-tuition"
                className="inline-flex items-center gap-2 rounded-full border border-ink-300 bg-white/60 px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:bg-white active:scale-[0.97] dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                Book private tuition <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

          <ul className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4 lg:w-[32rem] lg:grid-cols-2">
            {MARKS.map((m, i) => (
              <motion.li
                key={m.n}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 + i * 0.1, duration: 0.5 }}
                className="border-l-2 border-ink-200 pl-3 dark:border-white/25"
              >
                <span className="font-display text-sm tracking-widest text-deep dark:text-primary">
                  ({m.n})
                </span>
                <p className="mt-1 text-xs font-semibold leading-snug text-ink-700 dark:text-white/85">
                  {m.label}
                </p>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* ── Programme marquee — continuous discovery (pause on hover) ── */}
      <motion.div style={{ y: reelY }} className="relative w-full">
        <ProgrammeMarquee />
      </motion.div>
    </section>
  );
}
