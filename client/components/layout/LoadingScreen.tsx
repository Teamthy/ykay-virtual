"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// First-visit brand loader (reference language: madeinevolve.com).
//
// Deep-green curtain: "PLEASE WAIT" spells itself out letter by letter while a
// counter runs 0 → 100 under "EXPERIENCE LOADING", then the whole curtain
// wipes upward and the page is revealed.
//
// Rules:
//   - once per browser session (sessionStorage guard)
//   - never shown to prefers-reduced-motion users
//   - never blocks the page for search engines / no-JS (renders nothing)

const SESSION_KEY = "ykv-intro-played";

export function LoadingScreen() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (reduce) return;
    let played = false;
    try {
      played = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode — treat as not played */
    }
    if (played) return;

    setShow(true);
    document.documentElement.style.overflow = "hidden";

    // Counter: eased 0 → 100 in ~1.7s.
    const start = performance.now();
    const DURATION = 1700;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out cubic so it sweeps fast then settles — feels like real loading
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const done = window.setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 2400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      document.documentElement.style.overflow = "";
    };
  }, [reduce]);

  // Release scroll whenever the curtain leaves.
  useEffect(() => {
    if (!show) document.documentElement.style.overflow = "";
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          exit={{ y: "-100%" }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-deep-green"
          aria-hidden="true"
        >
          {/* PLEASE WAIT — letter by letter */}
          <div className="flex overflow-hidden">
            {Array.from("PLEASE WAIT").map((ch, i) => (
              <motion.span
                key={`${ch}-${i}`}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.15 + i * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="font-display text-2xl tracking-[0.45em] text-white sm:text-4xl"
              >
                {ch === " " ? "\u00A0" : ch}
              </motion.span>
            ))}
          </div>

          {/* EXPERIENCE LOADING */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="mt-4 text-[10px] font-bold uppercase tracking-[0.5em] text-white/50"
          >
            Experience loading
          </motion.p>

          {/* Counter */}
          <div className="mt-10 flex items-baseline gap-1 font-display text-primary">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-6xl tabular-nums sm:text-7xl"
            >
              {String(count).padStart(3, "0")}
            </motion.span>
          </div>

          {/* progress hairline */}
          <div className="mt-6 h-px w-48 overflow-hidden bg-white/15 sm:w-64">
            <div
              className="h-full bg-primary transition-[width] duration-100 ease-linear"
              style={{ width: `${count}%` }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
