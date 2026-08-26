"use client";

import { Award, BarChart3, RefreshCw, Trophy, Star } from "lucide-react";
import { useState } from "react";
import type { GradeRow, LeaderboardRow, ReviewItem } from "@/features/dashboard/api";

/** Gradebook widget — per-subject mastery bars. */
export function GradebookWidget({ rows }: { rows: GradeRow[] }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <BarChart3 size={16} className="text-primary" /> Gradebook
      </h3>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.subject}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-semibold text-ink-700">{r.subject}</span>
              <span className="text-xs text-ink-500">{Math.round(r.score)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.score)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Review queue widget — missed questions to re-drill. */
export function ReviewQueueWidget({ items }: { items: ReviewItem[] }) {
  if (!items || items.length === 0) return null;
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  if (!item) return null;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <RefreshCw size={16} className="text-primary" /> Review queue
      </h3>
      <div className="mt-3 rounded-xl bg-ink-50/60 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{item.subject}</p>
        <p className="mt-1 text-sm font-semibold text-ink-800">{item.question}</p>
        <p className="mt-2 text-xs text-ink-500">
          Correct answer: <span className="font-semibold text-green-700">{item.correct || "—"}</span>
        </p>
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-ink-400">{idx + 1} / {items.length}</span>
          <button onClick={() => setIdx((i) => (i + 1) % items.length)} className="font-bold text-brand-blue hover:underline">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/** Leaderboard widget — XP-ranked, opted-in users only. */
export function LeaderboardWidget({ rows, yourRank }: { rows: LeaderboardRow[]; yourRank?: number }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 font-bold text-ink-900">
        <Trophy size={16} className="text-brand-gold" /> Leaderboard
      </h3>
      <p className="mt-0.5 text-[11px] text-ink-400">Only learners who opted in appear. Compete or opt out anytime.</p>
      <ol className="mt-3 space-y-1.5">
        {rows.slice(0, 5).map((r, i) => (
          <li key={r.user_id} className="flex items-center justify-between rounded-lg px-2 py-1 text-sm hover:bg-ink-50">
            <span className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${i < 3 ? "bg-brand-gold text-deep" : "bg-ink-100 text-ink-500"}`}>
                {i + 1}
              </span>
              <span className="font-medium text-ink-700">{r.name || "Learner"}</span>
            </span>
            <span className="text-xs font-bold text-ink-500">{r.xp} XP</span>
          </li>
        ))}
      </ol>
      {typeof yourRank === "number" && yourRank > 5 && (
        <p className="mt-2 text-xs text-ink-400">You're ranked #{yourRank}</p>
      )}
    </div>
  );
}

/** Post-lesson feedback prompt widget. */
export function FeedbackPrompt({ onRate }: { onRate: (rating: number) => void }) {
  const [rated, setRated] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <Star size={16} className="text-brand-gold" /> How was your last lesson?
      </h3>
      {rated ? (
        <p className="mt-2 text-sm text-green-700">Thanks for rating it {rated}/5! Your feedback helps tutors improve.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => {
                setRated(n);
                onRate(n);
              }}
              className="grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-sm font-bold text-ink-600 transition-colors hover:border-primary hover:bg-primary hover:text-ink-900"
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const achievementIcon = (n: string) => <Award size={16} className="text-primary" />;
