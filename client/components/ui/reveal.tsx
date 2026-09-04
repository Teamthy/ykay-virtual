"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

// Reveal - energetic scroll-reveal for sections and cards. Spring physics give
// a lively pop as content lands; honours prefers-reduced-motion by rendering
// immediately. `delay` is in milliseconds.

export type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p";
};

export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", stiffness: 120, damping: 14, mass: 0.9, delay: delay / 1000 }}
    >
      {children}
    </Comp>
  );
}
