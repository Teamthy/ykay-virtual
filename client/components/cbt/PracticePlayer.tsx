"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Dices,
  Flag,
  TimerReset,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  gradeBankPaper,
  type BankGradeResult,
  type BankPaper,
} from "@/features/cbt/api";

// PracticePlayer — a JAMB/WAEC-style sitting drawn from the shared practice
// bank. Unlike the exam player there is no server attempt state: a paper is a
// RANDOM draw (every student sees a different set), answers live client-side,
// and grading happens on the server at submit — the key is never in the paper.
//
// Lifecycle: brief → running → result (score + per-question review).
// The timer is a practice aid: at 00:00 the paper auto-submits (JAMB pace).

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function PracticePlayer({
  paper,
  onRedraw,
  redrawing,
}: {
  paper: BankPaper;
  onRedraw: () => void;
  redrawing: boolean;
}) {
  const [phase, setPhase] = useState<"brief" | "running" | "result">("brief");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState(paper.count * 45); // JAMB pace: 45s/q
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BankGradeResult | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [error, setError] = useState("");
  const [showCorrectOnly, setShowCorrectOnly] = useState<"" | "wrong" | "all">(
    "all",
  );
  const submittedRef = useRef(false);

  const qs = paper.questions;
  const q = qs[Math.min(idx, qs.length - 1)];
  const answeredCount = qs.filter((x) => answers[x.id] !== undefined).length;

  const finish = async (expired: boolean) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const payload = qs.map((x) => ({
        question_id: x.id,
        selected_index: answers[x.id] ?? null,
      }));
      const res = await gradeBankPaper(payload);
      setResult(res);
      setPhase("result");
      setConfirmSubmit(false);
    } catch (e) {
      submittedRef.current = false;
      setError(
        e instanceof Error
          ? e.message
          : "Could not submit — check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // countdown → auto-submit at zero
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          void finish(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const review = useMemo(() => {
    if (!result) return [];
    if (showCorrectOnly === "wrong") return result.review.filter((r) => !r.correct);
    return result.review;
  }, [result, showCorrectOnly]);

  // ── brief ────────────────────────────────────────────────────────────────
  if (phase === "brief") {
    return (
      <div className="rounded-3xl border border-[--line] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
              Practice paper · {paper.subject}
            </p>
            <h1 className="mt-2 font-display text-3xl text-deep">
              {qs.length} randomly drawn questions
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
              This paper was drawn just for you — a fresh random set every
              time. Suggested pace: <strong>45 seconds</strong> per question
              ({fmt(qs.length * 45)} total). The clock is a training aid; when
              it hits zero the paper submits itself, exactly like JAMB.
            </p>
          </div>
          <div className="rounded-2xl bg-primary/10 px-5 py-4 text-center">
            <Clock size={20} className="mx-auto text-primary-dark" />
            <p className="mt-1 font-mono text-2xl font-bold text-deep">
              {fmt(qs.length * 45)}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
              time budget
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setPhase("running")}
            className="btn-primary inline-flex items-center gap-2"
          >
            <TimerReset size={16} /> Start paper
          </button>
          <button
            onClick={onRedraw}
            disabled={redrawing}
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Dices size={16} /> {redrawing ? "Drawing…" : "Draw different questions"}
          </button>
        </div>
      </div>
    );
  }

  // ── result ───────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const band =
      result.score >= 70 ? "text-green-600" : result.score >= 50 ? "text-amber-600" : "text-red-600";
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-[--line] bg-white p-8 text-center shadow-sm">
          <Trophy size={32} className="mx-auto text-primary-dark" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
            Practice result · {paper.subject}
          </p>
          <p className={`mt-2 font-display text-6xl font-bold ${band}`}>
            {result.score}%
          </p>
          <p className="mt-2 text-sm text-ink-600">
            {result.correct} of {result.total} correct — every question below
            comes with the answer and a short explanation.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button onClick={onRedraw} disabled={redrawing} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <Dices size={16} /> {redrawing ? "Drawing…" : "Practise again (new questions)"}
            </button>
            {result.review.some((r) => !r.correct) && (
              <button
                onClick={() =>
                  setShowCorrectOnly(showCorrectOnly === "wrong" ? "all" : "wrong")
                }
                className="btn-secondary"
              >
                {showCorrectOnly === "wrong" ? "Show all questions" : "Review my mistakes only"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {review.map((r, i) => (
            <div key={r.id} className="rounded-3xl border border-[--line] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                {r.correct ? (
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
                ) : (
                  <XCircle size={20} className="mt-0.5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold leading-relaxed text-ink-900">
                    {i + 1}. {r.text}
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {r.options.map((o, j) => {
                      const isKey = j === r.correct_index;
                      const isPick = j === r.selected_index;
                      return (
                        <div
                          key={j}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            isKey
                              ? "border-green-300 bg-green-50 font-semibold text-green-800"
                              : isPick
                                ? "border-red-300 bg-red-50 text-red-700 line-through"
                                : "border-[--line] text-ink-600"
                          }`}
                        >
                          {LETTERS[j]}. {o}
                          {isKey && <span className="ml-2 text-[11px] font-bold">✓ answer</span>}
                          {isPick && !isKey && (
                            <span className="ml-2 text-[11px] font-bold">your pick</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {r.explanation && (
                    <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">
                      <strong>Why:</strong> {r.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── running ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* status bar */}
      <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[--line] bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-bold text-deep">
            Question {idx + 1} <span className="text-ink-400">/ {qs.length}</span>
          </span>
          <span className="text-ink-500">
            answered <strong className="text-deep">{answeredCount}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-mono text-lg font-bold ${
              remaining < 60 ? "animate-pulse text-red-600" : "text-deep"
            }`}
          >
            {fmt(remaining)}
          </span>
          {confirmSubmit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => void finish(false)}
                disabled={submitting}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
              <button onClick={() => setConfirmSubmit(false)} className="btn-secondary text-sm">
                Keep going
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSubmit(true)}
              className="btn-primary text-sm"
            >
              Submit paper
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* question */}
      {q && (
        <div className="rounded-3xl border border-[--line] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-primary/10 px-3 py-1 uppercase tracking-wide text-primary-dark">
              {q.topic}
            </span>
            <span className="rounded-full bg-ink-100 px-3 py-1 text-ink-500">
              {"★".repeat(q.difficulty)}
            </span>
            <button
              onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))}
              className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                flags[q.id] ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"
              }`}
            >
              <Flag size={12} /> {flags[q.id] ? "Flagged" : "Flag"}
            </button>
          </div>
          <p className="mt-4 text-lg font-semibold leading-relaxed text-ink-900">
            {q.text}
          </p>
          <div className="mt-5 grid gap-3">
            {q.options.map((o, j) => (
              <button
                key={j}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  answers[q.id] === j
                    ? "border-primary bg-primary/10 font-semibold text-deep"
                    : "border-[--line] text-ink-700 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-bold ${
                    answers[q.id] === j
                      ? "border-primary bg-primary text-white"
                      : "border-[--line] text-ink-500"
                  }`}
                >
                  {LETTERS[j]}
                </span>
                <span className="text-sm leading-relaxed">{o}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="btn-secondary inline-flex items-center gap-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            {answers[q.id] !== undefined && (
              <button
                onClick={() =>
                  setAnswers(({ [q.id]: _drop, ...rest }) => rest)
                }
                className="text-xs font-semibold text-ink-400 hover:text-ink-600"
              >
                Clear answer
              </button>
            )}
            <button
              onClick={() =>
                idx === qs.length - 1 ? setConfirmSubmit(true) : setIdx((i) => i + 1)
              }
              className="btn-primary inline-flex items-center gap-1.5 text-sm"
            >
              {idx === qs.length - 1 ? "Review & submit" : "Next"}
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* palette */}
      <div className="rounded-3xl border border-[--line] bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
          Question palette
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {qs.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setIdx(i)}
              className={`h-9 w-9 rounded-xl border text-sm font-bold transition ${
                i === idx
                  ? "border-primary bg-primary text-white"
                  : flags[x.id]
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : answers[x.id] !== undefined
                      ? "border-green-300 bg-green-100 text-green-700"
                      : "border-[--line] text-ink-500 hover:border-primary/50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-ink-400">
          <span className="font-bold text-green-600">■</span> answered ·{" "}
          <span className="font-bold text-amber-500">■</span> flagged ·{" "}
          <span className="font-bold text-ink-300">■</span> untouched
        </p>
      </div>
    </div>
  );
}
