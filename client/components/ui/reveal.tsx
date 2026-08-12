"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Reveal — lightweight scroll-reveal (IntersectionObserver + CSS transition,
// no animation library). Fades + slides content up once as it enters the
// viewport; respects prefers-reduced-motion.

export type RevealProps = {
  children: React.ReactNode;
  delay?: number; // ms stagger
  className?: string;
  as?: "div" | "section" | "li" | "span" | "p";
};

export function Reveal({ children, delay = 0, className, as = "div" }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "reveal-visible", className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
