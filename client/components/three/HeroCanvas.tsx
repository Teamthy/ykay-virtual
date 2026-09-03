"use client";

// HeroCanvas — gated host for the hero 3D layer (see threejs-homepage-plan.md).
// Gates: NEXT_PUBLIC_DISABLE_3D kill switch, WebGL availability, Data Saver,
// prefers-reduced-motion (static field), weak devices, pauses when hidden or
// scrolled out of view. Watches the YK-Virtual theme (html.dark) so the
// particle color always matches the active theme.

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const Scene = dynamic(() => import("./GrowthScene"), { ssr: false });

type Mode = "checking" | "off" | "static" | "on";

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function useTheme(): "light" | "dark" {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const el = document.documentElement;
    const update = () =>
      setTheme(el.classList.contains("dark") ? "dark" : "light");
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

export function HeroCanvas({ className }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("checking");
  const [paused, setPaused] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DISABLE_3D === "true") {
      setMode("off");
      return;
    }
    if (
      typeof navigator !== "undefined" &&
      (navigator as { saveData?: boolean }).saveData
    ) {
      setMode("off");
      return;
    }
    if (!webglAvailable()) {
      setMode("off");
      return;
    }
    const weak = (navigator.hardwareConcurrency ?? 8) < 4;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setMode(reduce.matches || weak ? "static" : "on");
    apply();
    reduce.addEventListener("change", apply);
    return () => reduce.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (mode !== "on" && mode !== "static") return;
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const host = hostRef.current;
    let io: IntersectionObserver | null = null;
    if (host && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        ([e]) => setPaused(!e.isIntersecting || document.hidden),
        {
          threshold: 0,
        },
      );
      io.observe(host);
    }
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, [mode]);

  if (mode === "checking" || mode === "off") return null;

  const compact = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div ref={hostRef} className={className} aria-hidden="true">
      <Scene
        paused={paused}
        speed={mode === "static" ? 0 : 1}
        theme={theme}
        compact={compact}
      />
    </div>
  );
}
