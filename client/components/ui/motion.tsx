"use client";

// Motion helpers shared across the app.
//   MotionProvider — app-wide framer config; reducedMotion="user" makes every
//                    animation respect the OS reduced-motion setting.
//   HeroIntro      — one-time entrance animation for hero copy blocks
//                    (used inside PageHero / InnerHero so every marketing
//                    page gets the same subtle entrance for free).

import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export function HeroIntro({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 110, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}
