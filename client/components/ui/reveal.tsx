"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// Reveal - subtle scroll-reveal for sections and cards. Now powered by
// framer-motion (whileInView, once). Fades + lifts content as it enters the
// viewport; honours prefers-reduced-motion by rendering immediately.

export type RevealProps = {
  children: React.ReactNode;
  delay?: number; // ms stagger
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p";
};

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduce = useReducedMotion();
  const Comp =
    (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </Comp>
  );
}
