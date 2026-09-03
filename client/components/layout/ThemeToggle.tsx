"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Dark mode (P2): applies `dark` on <html>, persists the choice, falls back
// to the system preference. CSS variables + targeted overrides in globals.css
// handle the visual switch.

const KEY = "yk-virtual-theme";

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
  );
}

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    const initial = stored ? stored === "dark" : systemPrefersDark();
    setDark(initial);
    applyTheme(initial ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next ? "dark" : "light");
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={`grid size-9 place-items-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 ${className}`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
