"use client";

// AnimatedText — typographic motion system for YK-Virtual.
//
// Three pieces:
//   AnimatedText — splits text into per-letter spans and springs each one in
//                  with a small rotate/scale overshoot (the "jumpy" feel).
//   WordCycle    — one word at a time from a list, springing in and out.
//   Marquee      — an infinite horizontal band of repeated text.
//
// All three honour prefers-reduced-motion: they render plain, static text with
// no transforms. Word wrapping is preserved by wrapping each WORD in an
// inline-block span and only splitting letters inside it, so a long headline
// breaks between words like normal text and never mid-word.

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Elements this component may render as. Kept concrete so the JSX children
 * type stays sound under React 19's stricter intrinsic-element typing. */
type TextTag = "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4";

const SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 14,
  mass: 0.6,
} as const;

/** Per-letter springy reveal. Splits on spaces so words never break apart. */
export function AnimatedText({
  text,
  className,
  as: Tag = "span",
  delay = 0,
  stagger = 0.025,
  once = true,
  animateOnLoad = false,
}: {
  text: string;
  className?: string;
  /** Element to render as — e.g. "h1", "h2". Defaults to a span. */
  as?: TextTag;
  /** Delay before the first letter, in SECONDS. */
  delay?: number;
  /** Gap between letters, in SECONDS. */
  stagger?: number;
  once?: boolean;
  /** Animate immediately on mount instead of when scrolled into view. */
  animateOnLoad?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <Tag className={className}>{text}</Tag>;

  const words = text.split(" ");
  let index = 0;

  const motionProps = animateOnLoad
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once, margin: "-40px" } };

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <motion.span
        initial="hidden"
        {...motionProps}
        style={{ display: "inline" }}
        aria-hidden="true"
      >
        {words.map((word, w) => (
          <span
            key={`${word}-${w}`}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
            aria-hidden="true"
          >
            {Array.from(word).map((char, c) => {
              const i = index++;
              return (
                <motion.span
                  key={`${char}-${c}`}
                  style={{ display: "inline-block", willChange: "transform" }}
                  variants={{
                    hidden: { opacity: 0, y: "0.5em", rotate: -8, scale: 0.8 },
                    show: {
                      opacity: 1,
                      y: 0,
                      rotate: 0,
                      scale: 1,
                      transition: { ...SPRING, delay: delay + i * stagger },
                    },
                  }}
                >
                  {char}
                </motion.span>
              );
            })}
            {w < words.length - 1 ? "\u00A0" : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Rotating word — springs the old word out and the next one in. */
export function WordCycle({
  words,
  className,
  interval = 2200,
}: {
  words: string[];
  className?: string;
  /** Milliseconds each word stays on screen. */
  interval?: number;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const count = words.length;

  useEffect(() => {
    if (reduce || count < 2) return;
    const id = window.setInterval(
      () => setI((prev) => (prev + 1) % count),
      interval,
    );
    return () => window.clearInterval(id);
  }, [reduce, count, interval]);

  if (reduce) {
    return <span className={className}>{words[0]}</span>;
  }

  return (
    <span
      className={className}
      style={{ display: "inline-grid", verticalAlign: "bottom" }}
    >
      {words.map((word, idx) => (
        <motion.span
          key={word}
          aria-hidden={idx === i ? undefined : "true"}
          style={{ gridArea: "1 / 1", display: "inline-block" }}
          initial={false}
          animate={
            idx === i
              ? { opacity: 1, y: 0, rotate: 0, scale: 1 }
              : { opacity: 0, y: "-0.45em", rotate: 5, scale: 0.85 }
          }
          transition={SPRING}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/** Infinite horizontal band. Decorative, so it is hidden from screen readers. */
export function Marquee({
  items,
  className,
  itemClassName,
  duration = 26,
  separator = "\u00B7",
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
  /** Seconds for one full loop. */
  duration?: number;
  separator?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const run = [...items, ...items];

  const row = (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {run.map((item, i) => (
        <span key={`${item}-${i}`} className={itemClassName}>
          {item}
          <span style={{ padding: "0 0.75em", opacity: 0.55 }}>
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  if (reduce) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{ overflow: "hidden" }}
      >
        <span style={{ display: "inline-flex", whiteSpace: "nowrap" }}>
          {row}
        </span>
      </div>
    );
  }

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ overflow: "hidden" }}
    >
      <motion.div
        style={{
          display: "inline-flex",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration, ease: "linear", repeat: Infinity }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  );
}

export default AnimatedText;
