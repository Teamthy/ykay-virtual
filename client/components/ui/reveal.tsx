"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

// Reveal - energetic scroll-reveal for sections and cards. Spring physics give
// a lively pop as content lands; honours prefers-reduced-motion by rendering
// immediately. `delay` is in milliseconds.

export type RevealVariant = "up" | "left" | "right" | "zoom" | "blur";

export type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p";
  /** Motion personality — vary per section so pages never feel uniform. */
  variant?: RevealVariant;
};

type Frame = {
  opacity: number;
  y?: number;
  x?: number;
  scale?: number;
  filter?: string;
};
const VARIANTS: Record<RevealVariant, { initial: Frame; target: Frame }> = {
  up: { initial: { opacity: 0, y: 36 }, target: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: -48 }, target: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: 48 }, target: { opacity: 1, x: 0 } },
  zoom: {
    initial: { opacity: 0, scale: 0.88 },
    target: { opacity: 1, scale: 1 },
  },
  blur: {
    initial: { opacity: 0, y: 24, filter: "blur(10px)" },
    target: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  variant = "up",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Comp =
    (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const v = VARIANTS[variant];
  return (
    <Comp
      className={className}
      initial={v.initial}
      whileInView={v.target}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 16,
        mass: 0.9,
        delay: delay / 1000,
      }}
    >
      {children}
    </Comp>
  );
}
