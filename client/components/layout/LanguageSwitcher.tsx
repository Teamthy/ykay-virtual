"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { getStoredLang, setStoredLang, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Language switcher (P2 i18n): EN / FR / YO persisted; the current dict is
// read via useDict() wherever chrome strings are translated. `tone="dark"`
// renders the trigger for the dark floating pill header.

const OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "yo", label: "Yorùbá" },
];

export function LanguageSwitcher({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
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
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
          tone === "dark"
            ? "border-white/15 bg-white/10 text-white/85 hover:border-white/30"
            : "border-black/10 bg-white text-[#0F2A1A]/75 hover:border-black/20",
        )}
      >
        <Globe size={14} />
        <span className="uppercase">{lang}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-40 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-lg">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-[#F9F6ED] ${
                lang === o.value ? "font-bold text-[#0F2A1A]" : "text-[#0F2A1A]/75"
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
