"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotionSync } from "./motion.prefers";

/**
 * Scroll-reveal wrapper — IntersectionObserver + CSS transitions using the
 * motion contract easing cubic-bezier(0.16, 1, 0.3, 1) (see
 * .motion-reveal in globals.css). Honours prefers-reduced-motion.
 */

export type RevealVariant = "up" | "left" | "right" | "zoom" | "blur";

export function Reveal({
  children,
  variant = "up",
  delay = 0,
  className,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotionSync()) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={variant}
      data-reveal-state={shown ? "shown" : "pending"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`motion-reveal ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
