"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { getDailyQuote } from "@/features/dashboard/api";

/** Daily welcome quote for all users — different quote per user, changes daily. */
export function WelcomeQuote({ variant = "light" }: { variant?: "light" | "deep" }) {
  const quote = useQuery({ queryKey: ["dashboard", "quote"], queryFn: getDailyQuote, staleTime: 30 * 60_000, retry: false });
  if (quote.isError || !quote.data) return null;
  const deep = variant === "deep";
  return (
    <div className={`rounded-2xl border px-5 py-4 text-center ${deep ? "border-white/15 bg-white/5 text-white" : "border-primary/30 bg-primary-light"}`}>
      <p className={`font-display text-lg italic ${deep ? "text-white" : "text-deep"}`}>"{quote.data}"</p>
      <p className={`mt-1 flex items-center justify-center gap-1 text-[11px] uppercase tracking-wide ${deep ? "text-white/50" : "text-ink-400"}`}>
        <Sparkles size={11} /> Today's welcome — a new quote every day
      </p>
    </div>
  );
}
