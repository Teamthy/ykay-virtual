"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  TimerReset,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import {
  getAttemptReview,
  startAttempt,
  submitAttempt,
  type AttemptResult,
  type AttemptReview,
  type ExamPaper,
} from "@/features/cbt/api";

// ExamPlayer — a JAMB/WAEC-style CBT sitting for one practice paper.
//
// Lifecycle: brief → running → result → review.
// - The timer is SERVER-authoritative: StartAttempt returns expires_at and the
//   countdown is computed from it, so a refresh cannot extend a sitting.
// - StartAttempt is idempotent, so "Start" doubles as "Resume": reloading the
//   paper mid-sitting returns the same open attempt with the same deadline.
// - Unanswered questions submit as unanswered (the server grades the whole
//   paper); expiry auto-submits whatever is on screen.
// - The paper never contains the answer key — grading is server-side and the
//   key only comes back in the review of a SUBMITTED attempt.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function ExamPlayer({ paper }: { paper: ExamPaper }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"brief" | "running" | "result">("brief");
  const [attemptId, setAttemptId] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [error, setError] = useState("");
  const submittedRef = useRef(false);

  const qs = useMemo(
    () => [...paper.questions].sort((a, b) => a.position - b.position),
    [paper.questions],
  );
  const q = qs[idx];
  const answeredCount = qs.filter((x) => answers[x.id] !== undefined).length;

  const review = useQuery<AttemptReview>({
    queryKey: ["cbt", "review", result?.attempt_id],
    queryFn: () => getAttemptReview(result!.attempt_id),
    enabled: phase === "result" && !!result,
    staleTime: 60_000,
  });

  const finish = useCallback(
    async (id: string, current: Record<string, number>, expired: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError("");
      try {
        const res = await submitAttempt(id, current);
        setResult(res);
        setPhase("result");
        setConfirmSubmit(false);
        await qc.invalidateQueries({ queryKey: ["cbt", "attempts"] });
      } catch (e) {
        submittedRef.current = false;
        setError(
          e instanceof Error ? e.message : "Could not submit — try again.",
        );
        if (expired)
          setError("Time is up, but the submit failed — press Submit again.");
      } finally {
        setSubmitting(false);
      }
    },
    [qc],
  );

  // Countdown + auto-submit at zero. answersRef keeps the latest answers
  // without re-arming the interval on every keystroke.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => {
    if (phase !== "running" || !expiresAt || !attemptId) return;
    const tick = () => {
      const left = (expiresAt - Date.now()) / 1000;
      setRemaining(left);
      if (left <= 0) void finish(attemptId, answersRef.current, true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [phase, expiresAt, attemptId, finish]);

  // Keyboard: A–F choose, ←/→ move, F flag, Enter next.
  useEffect(() => {
    if (phase !== "running" || !q) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "arrowright") setIdx((i) => Math.min(i + 1, qs.length - 1));
      else if (k === "arrowleft") setIdx((i) => Math.max(i - 1, 0));
      else if (k === "f") setFlags((f) => ({ ...f, [q.id]: !f[q.id] }));
      else if (k === "enter") setIdx((i) => Math.min(i + 1, qs.length - 1));
      else {
        const li = LETTERS.indexOf(k.toUpperCase());
        if (li >= 0 && li < q.options.length)
          setAnswers((a) => ({ ...a, [q.id]: li }));
        else if (/^[1-6]$/.test(k)) {
          const ni = Number(k) - 1;
          if (ni < q.options.length) setAnswers((a) => ({ ...a, [q.id]: ni }));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, q, qs.length]);

  const begin = async () => {
    setStarting(true);
    setError("");
    try {
      const a = await startAttempt(paper.id);
      setAttemptId(a.attempt_id);
      setExpiresAt(new Date(a.expires_at).getTime());
      setRemaining((new Date(a.expires_at).getTime() - Date.now()) / 1000);
      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the attempt.");
    } finally {
      setStarting(false);
    }
  };

  // ---- brief ----------------------------------------------------------------
  if (phase === "brief") {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
          {paper.subject}
        </p>
        <h1 className="mt-2 font-display text-3xl text-deep">{paper.title}</h1>
        {paper.description ? (
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
            {paper.description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-light px-4 py-2 font-bold text-deep">
            <Clock size={15} /> {paper.duration_minutes} min
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 font-bold text-ink-700">
            <TimerReset size={15} /> {qs.length} questions
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 font-bold text-ink-700">
            <Trophy size={15} /> pass mark {paper.passing_score}%
          </span>
        </div>
        <ul className="mt-6 space-y-2 text-sm leading-6 text-ink-600">
          <li>
            • The timer starts the moment you begin and <b>cannot be paused</b>{" "}
            — the deadline is set by the server, so refreshing does not extend
            it.
          </li>
          <li>
            • You can flag questions and move freely between them before
            submitting.
          </li>
          <li>
            • When time runs out, the paper submits itself with whatever you
            have answered.
          </li>
        </ul>
        {error ? (
          <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>
        ) : null}
        <button
          type="button"
          onClick={begin}
          disabled={starting || qs.length === 0}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-deep px-8 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <TimerReset size={16} />
          {starting
            ? "Starting…"
            : qs.length === 0
              ? "No questions yet"
              : "Start exam"}
        </button>
      </div>
    );
  }

  // ---- result / review --------------------------------------------------------
  if (phase === "result" && result) {
    const r = review.data;
    return (
      <div className="space-y-6">
        <div
          className={`rounded-3xl border p-8 text-center shadow-sm ${
            result.passed
              ? "border-primary/50 bg-primary-light/60"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
            {paper.subject} · {paper.title}
          </p>
          <p className="mt-3 font-display text-6xl text-deep">
            {result.score}%
          </p>
          <p className="mt-2 text-sm font-bold text-ink-700">
            {result.correct} of {result.total} correct ·{" "}
            {result.passed ? (
              <span className="text-primary-dark">PASSED</span>
            ) : (
              <span className="text-orange-700">
                Not yet — pass mark {paper.passing_score}%
              </span>
            )}
          </p>
          {result.expired ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <AlertTriangle size={13} /> time expired — auto-submitted
            </p>
          ) : null}
        </div>

        {r ? (
          <div className="space-y-4">
            <h2 className="font-display text-2xl text-deep">Review</h2>
            {r.questions.map((rq, i) => {
              const chosen = rq.chosen_index;
              const right = rq.correct_index;
              const ok = chosen === right;
              return (
                <div
                  key={rq.id}
                  className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm font-bold text-ink-800">
                    {i + 1}. {rq.text}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {rq.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                          oi === right
                            ? "bg-primary-light font-semibold text-deep"
                            : oi === chosen
                              ? "bg-red-50 font-semibold text-red-700"
                              : "text-ink-600"
                        }`}
                      >
                        {oi === right ? (
                          <CheckCircle2
                            size={15}
                            className="shrink-0 text-primary-dark"
                          />
                        ) : oi === chosen ? (
                          <XCircle
                            size={15}
                            className="shrink-0 text-red-500"
                          />
                        ) : (
                          <span className="w-[15px] shrink-0 text-center text-xs font-bold text-ink-400">
                            {LETTERS[oi]}
                          </span>
                        )}
                        <span>
                          {LETTERS[oi]}. {opt}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-ink-500">
                    {chosen === null ? (
                      <b className="text-orange-700">
                        You did not answer this question.{" "}
                      </b>
                    ) : null}
                    {rq.explanation ? `Explanation: ${rq.explanation}` : null}
                  </p>
                </div>
              );
            })}
          </div>
        ) : review.isLoading ? (
          <p className="text-sm text-ink-500">Loading review…</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/lms/exams"
            className="inline-flex items-center gap-2 rounded-full bg-deep px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Back to practice exams
          </Link>
          <button
            type="button"
            onClick={() => {
              submittedRef.current = false;
              setResult(null);
              setAnswers({});
              setFlags({});
              setIdx(0);
              setAttemptId("");
              setExpiresAt(null);
              setPhase("brief");
              void qc.invalidateQueries({ queryKey: ["cbt", "attempts"] });
            }}
            className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-ink-200 bg-white px-6 py-3 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
          >
            Sit this paper again
          </button>
        </div>
      </div>
    );
  }

  // ---- running ----------------------------------------------------------------
  if (!q) return null;
  const low = remaining <= 60;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
            {paper.subject}
          </p>
          <p className="font-bold text-ink-800">{paper.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-ink-500">
            {answeredCount}/{qs.length} answered
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-lg tabular-nums ${
              low
                ? "animate-pulse bg-red-100 text-red-700"
                : "bg-deep text-white"
            }`}
            aria-live="off"
          >
            <Clock size={16} /> {fmt(remaining)}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
        {/* Question card */}
        <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
              Question {idx + 1} of {qs.length}
            </p>
            <button
              type="button"
              onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))}
              aria-pressed={!!flags[q.id]}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                flags[q.id]
                  ? " bg-orange-100 text-orange-700"
                  : "bg-ink-100 text-ink-500 hover:bg-ink-200"
              }`}
            >
              <Flag size={12} /> {flags[q.id] ? "Flagged" : "Flag"}
            </button>
          </div>
          <p className="mt-3 text-lg font-semibold leading-relaxed text-ink-900">
            {q.text}
          </p>
          <div className="mt-5 space-y-2.5">
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi;
              return (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-primary bg-primary-light text-deep"
                      : "border-ink-100 bg-white text-ink-700 hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      selected
                        ? "bg-deep text-white"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {LETTERS[oi]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIdx((i) => Math.max(i - 1, 0))}
              disabled={idx === 0}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink-200 px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-30"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            {idx < qs.length - 1 ? (
              <button
                type="button"
                onClick={() => setIdx((i) => i + 1)}
                className="inline-flex items-center gap-1.5 rounded-full bg-deep px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmit(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-primary-hover"
              >
                <CheckCircle2 size={15} /> Submit
              </button>
            )}
          </div>
        </div>

        {/* Question map */}
        <div className="h-fit rounded-3xl border border-ink-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
            Questions
          </p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {qs.map((x, i) => {
              const answered = answers[x.id] !== undefined;
              const flagged = flags[x.id];
              const current = i === idx;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setIdx(i)}
                  aria-label={`Go to question ${i + 1}${flagged ? " (flagged)" : ""}`}
                  className={`relative grid size-9 place-items-center rounded-lg text-xs font-bold transition ${
                    current
                      ? "bg-deep text-white"
                      : answered
                        ? "bg-primary-light text-deep"
                        : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                  }`}
                >
                  {i + 1}
                  {flagged ? (
                    <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-orange-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] font-semibold text-ink-500">
            <p className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary-light ring-1 ring-primary/60" />{" "}
              answered
            </p>
            <p className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-orange-500" /> flagged
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-xs font-bold text-ink-900 transition hover:bg-primary-hover"
          >
            Submit paper
          </button>
        </div>
      </div>

      <p className="text-center text-[11px] text-ink-400">
        Keyboard: A–{LETTERS[Math.min(q.options.length, 6) - 1]} or 1–
        {Math.min(q.options.length, 6)} to answer · ← → to move · F to flag
      </p>

      {error ? (
        <p className="text-center text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      {confirmSubmit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-xl">
            <h3 className="font-display text-xl text-deep">
              Submit this paper?
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              You have answered <b>{answeredCount}</b> of <b>{qs.length}</b>{" "}
              questions.
              {answeredCount < qs.length
                ? " Unanswered questions are marked wrong."
                : " All questions answered."}{" "}
              You cannot change anything after submitting.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                disabled={submitting}
                className="flex-1 rounded-full border-[1.5px] border-ink-200 px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
              >
                Keep working
              </button>
              <button
                type="button"
                onClick={() => void finish(attemptId, answers, false)}
                disabled={submitting}
                className="flex-1 rounded-full bg-deep px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
