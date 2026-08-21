"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { getStoredLang, setStoredLang, type Lang } from "@/lib/i18n";

// Language switcher (P2 i18n): EN / FR / YO persisted; the current dict is
// read via useDict() wherever chrome strings are translated.

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "yo", label: "Yorùbá" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const [lang, setLang] = useState<Lang>("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLang(getStoredLang());
  }, []);

  const choose = (l: Lang) => {
    setLang(l);
    setStoredLang(l);
    setOpen(false);
    window.location.reload(); // simple full reload for now (SSR-safe)
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 text-xs font-semibold text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
      >
        <Globe size={14} />
        <span className="uppercase">{lang}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-xl border border-ink-100 bg-white py-1 shadow-lg dark:border-ink-700 dark:bg-ink-800">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-700 ${
                lang === o.value ? "font-bold text-primary-dark" : "text-ink-700 dark:text-ink-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
