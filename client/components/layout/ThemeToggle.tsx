"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

// Dark mode (P2): applies `dark` on <html> and persists the choice.
// Default is ALWAYS light, regardless of the device's
// `prefers-color-scheme` — a stored user selection (`yk-virtual-theme`)
// is honoured on subsequent visits.

const KEY = "yk-virtual-theme";

export function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* ignore */
    }
    // Stored selection wins; otherwise default to light (never system).
    const initial = stored === "dark" || stored === "light" ? stored === "dark" : false;
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
      aria-pressed={dark}
      className={`grid size-9 place-items-center rounded-lg text-[#0F2A1A]/70 transition-colors hover:bg-[#F9F6ED] ${className}`}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
