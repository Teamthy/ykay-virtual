"use client";

import { Flame } from "lucide-react";

/** Weekly learning-goal progress ring (Duolingo/GoStudent standard). */
export function WeeklyGoal({ done, goal }: { done: number; goal: number }) {
  const safeGoal = goal > 0 ? goal : 3;
  const pct = Math.min(100, Math.round((done / safeGoal) * 100));
  const r = 30;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="relative grid h-20 w-20 shrink-0 place-items-center">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#eef0f4" strokeWidth="8" />
          <circle
            cx="40" cy="40" r={r} fill="none" stroke="#70F250" strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-sm font-bold text-deep">{pct}%</span>
      </div>
      <div>
        <h3 className="flex items-center gap-2 font-bold text-ink-900">
          <Flame size={16} className="text-brand-gold" /> Weekly goal
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          <strong className="text-ink-900">{done}</strong> of <strong className="text-ink-900">{safeGoal}</strong> lessons this week
        </p>
        <p className="mt-0.5 text-xs text-ink-400">Keep your streak alive — {Math.max(0, safeGoal - done)} to go.</p>
      </div>
    </div>
  );
}
