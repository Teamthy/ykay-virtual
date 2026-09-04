"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Clock,
  TimerReset,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  createExam,
  deleteExam,
  getTutorExam,
  listExamAttempts,
  listTutorExams,
  updateExam,
  type ExamInput,
  type TutorAttemptItem,
} from "@/features/cbt/api";

// ExamAuthoring — the tutor side of CBT: write papers (title, subject,
// duration, pass mark, questions with the key + explanations), publish edits,
// and watch each paper's results. Mirrors the server's limits: max 60
// questions, 2-6 options each, 1-180 minutes, pass 0-100.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

type Draft = {
  id: string | null;
  subject: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  questions: {
    text: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }[];
};

function blankDraft(): Draft {
  return {
    id: null,
    subject: "",
    title: "",
    description: "",
    duration_minutes: 30,
    passing_score: 60,
    questions: [blankQuestion()],
  };
}

function blankQuestion() {
  return {
    text: "",
    options: ["", "", "", ""],
    correct_index: 0,
    explanation: "",
  };
}

export function ExamAuthoring() {
  const qc = useQueryClient();
  const exams = useQuery({
    queryKey: ["cbt", "tutor", "exams"],
    queryFn: listTutorExams,
    staleTime: 30_000,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [resultsFor, setResultsFor] = useState<string | null>(null);

  const results = useQuery<TutorAttemptItem[]>({
    queryKey: ["cbt", "tutor", "exams", resultsFor, "attempts"],
    queryFn: () => listExamAttempts(resultsFor!),
    enabled: !!resultsFor,
    staleTime: 15_000,
  });

  const q = draft?.questions ?? [];
  const setQ = (i: number, patch: Partial<Draft["questions"][number]>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            questions: d.questions.map((x, xi) =>
              xi === i ? { ...x, ...patch } : x,
            ),
          }
        : d,
    );

  const valid =
    !!draft &&
    draft.subject.trim() &&
    draft.title.trim() &&
    draft.duration_minutes >= 1 &&
    draft.duration_minutes <= 180 &&
    draft.passing_score >= 0 &&
    draft.passing_score <= 100 &&
    draft.questions.length >= 1 &&
    draft.questions.every(
      (x) =>
        x.text.trim() &&
        x.options.filter((o) => o.trim()).length >= 2 &&
        x.correct_index < x.options.length &&
        x.options[x.correct_index]?.trim(),
    );

  const save = async () => {
    if (!draft || !valid) return;
    setSaving(true);
    setError("");
    const input: ExamInput = {
      subject: draft.subject.trim(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      duration_minutes: draft.duration_minutes,
      passing_score: draft.passing_score,
      questions: draft.questions.map((x) => ({
        text: x.text.trim(),
        options: x.options.map((o) => o.trim()),
        correct_index: x.correct_index,
        explanation: x.explanation.trim(),
      })),
    };
    try {
      if (draft.id) await updateExam(draft.id, input);
      else await createExam(input);
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["cbt", "tutor", "exams"] });
      await qc.invalidateQueries({ queryKey: ["cbt", "exams"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the paper.");
    } finally {
      setSaving(false);
    }
  };

  // ---- editor --------------------------------------------------------------
  if (draft) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-deep">
            {draft.id ? "Edit paper" : "New practice paper"}
          </h2>
          <button
            type="button"
            onClick={() => setDraft(null)}
            className="text-sm font-bold text-ink-500 hover:underline"
          >
            Cancel
          </button>
        </div>

        <div className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink-700">
            Subject
            <input
              value={draft.subject}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, subject: e.target.value } : d))
              }
              placeholder="e.g. Mathematics"
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-normal text-ink-800 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-bold text-ink-700">
            Title
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, title: e.target.value } : d))
              }
              placeholder="e.g. Algebra basics — JSS3 mock"
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-normal text-ink-800 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-bold text-ink-700 sm:col-span-2">
            Description (optional)
            <input
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, description: e.target.value } : d))
              }
              placeholder="What this paper covers"
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-normal text-ink-800 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-bold text-ink-700">
            Duration (minutes, 1–180)
            <input
              type="number"
              min={1}
              max={180}
              value={draft.duration_minutes}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        duration_minutes: Math.max(
                          1,
                          Math.min(180, Number(e.target.value) || 1),
                        ),
                      }
                    : d,
                )
              }
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-normal text-ink-800 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm font-bold text-ink-700">
            Pass mark (%, 0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={draft.passing_score}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        passing_score: Math.max(
                          0,
                          Math.min(100, Number(e.target.value) || 0),
                        ),
                      }
                    : d,
                )
              }
              className="mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-normal text-ink-800 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="space-y-4">
          {q.map((x, i) => (
            <div
              key={i}
              className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-ink-400">
                  Question {i + 1} of {q.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move question up"
                    disabled={i === 0}
                    onClick={() =>
                      setDraft((d) => {
                        if (!d) return d;
                        const qs = [...d.questions];
                        [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
                        return { ...d, questions: qs };
                      })
                    }
                    className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  >
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move question down"
                    disabled={i === q.length - 1}
                    onClick={() =>
                      setDraft((d) => {
                        if (!d) return d;
                        const qs = [...d.questions];
                        [qs[i + 1], qs[i]] = [qs[i], qs[i + 1]];
                        return { ...d, questions: qs };
                      })
                    }
                    className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30"
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove question"
                    disabled={q.length <= 1}
                    onClick={() =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              questions: d.questions.filter(
                                (_, xi) => xi !== i,
                              ),
                            }
                          : d,
                      )
                    }
                    className="grid size-8 place-items-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <textarea
                value={x.text}
                onChange={(e) => setQ(i, { text: e.target.value })}
                placeholder="The question text"
                rows={2}
                className="mt-3 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-800 outline-none focus:border-primary"
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {x.options.map((o, oi) => (
                  <div
                    key={oi}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition ${
                      x.correct_index === oi
                        ? "border-primary bg-primary-light/50"
                        : "border-ink-100"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setQ(i, { correct_index: oi })}
                      aria-label={`Mark option ${LETTERS[oi]} as correct`}
                      aria-pressed={x.correct_index === oi}
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        x.correct_index === oi
                          ? "bg-deep text-white"
                          : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {LETTERS[oi]}
                    </button>
                    <input
                      value={o}
                      onChange={(e) =>
                        setQ(i, {
                          options: x.options.map((v, vi) =>
                            vi === oi ? e.target.value : v,
                          ),
                        })
                      }
                      placeholder={`Option ${LETTERS[oi]}`}
                      className="w-full bg-transparent text-sm text-ink-800 outline-none"
                    />
                    {x.options.length > 2 ? (
                      <button
                        type="button"
                        aria-label={`Remove option ${LETTERS[oi]}`}
                        onClick={() =>
                          setQ(i, {
                            options: x.options.filter((_, vi) => vi !== oi),
                            correct_index:
                              x.correct_index >= x.options.length - 1
                                ? 0
                                : x.correct_index,
                          })
                        }
                        className="shrink-0 text-ink-300 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {x.options.length < 6 ? (
                <button
                  type="button"
                  onClick={() => setQ(i, { options: [...x.options, ""] })}
                  className="mt-2 text-xs font-bold text-primary-dark hover:underline"
                >
                  + add option
                </button>
              ) : null}
              <input
                value={x.explanation}
                onChange={(e) => setQ(i, { explanation: e.target.value })}
                placeholder="Explanation shown in the student's review (optional)"
                className="mt-3 w-full rounded-xl border border-ink-200 px-3.5 py-2.5 text-xs text-ink-600 outline-none focus:border-primary"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={q.length >= 60}
            onClick={() =>
              setDraft((d) =>
                d ? { ...d, questions: [...d.questions, blankQuestion()] } : d,
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
          >
            <Plus size={15} /> Add question
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving}
            title={
              valid
                ? ""
                : "Fill the subject, title and every question (2+ options each)"
            }
            className="inline-flex items-center gap-2 rounded-full bg-deep px-7 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "Publishing…" : draft.id ? "Save paper" : "Publish paper"}
          </button>
          {error ? (
            <p className="text-sm font-semibold text-red-600">{error}</p>
          ) : null}
        </div>
      </div>
    );
  }

  // ---- list ----------------------------------------------------------------
  const rows = exams.data ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-deep">Your CBT papers</h2>
          <p className="mt-1 text-sm text-ink-500">
            Papers without a cohort are open to every learner; papers attached
            to a cohort are visible to its students only.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(blankDraft())}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-deep px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
        >
          <Plus size={15} /> New paper
        </button>
      </div>

      {exams.isLoading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center text-sm text-ink-500">
          No papers yet — write your first practice paper.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-deep">
                    {e.subject}
                  </span>
                  <p className="mt-2 font-bold text-ink-800">{e.title}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={13} /> {e.duration_minutes} min
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <TimerReset size={13} /> {e.question_count} questions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy size={13} /> pass {e.passing_score}%
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setResultsFor(resultsFor === e.id ? null : e.id)
                    }
                    className="rounded-full border-[1.5px] border-ink-200 px-4 py-2 text-xs font-bold text-ink-700 transition hover:bg-ink-50"
                  >
                    Results
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${e.title}`}
                    onClick={async () => {
                      const full = await getTutorExam(e.id);
                      setDraft({
                        id: full.id,
                        subject: full.subject,
                        title: full.title,
                        description: full.description ?? "",
                        duration_minutes: full.duration_minutes,
                        passing_score: full.passing_score,
                        questions: (full.questions ?? []).map((x) => ({
                          text: x.text,
                          options: x.options,
                          correct_index: x.correct_index ?? 0,
                          explanation: x.explanation ?? "",
                        })),
                      });
                    }}
                    className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink-200 text-ink-500 transition hover:bg-ink-50"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${e.title}`}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Delete "${e.title}"? Its questions and attempts go with it.`,
                        )
                      )
                        return;
                      await deleteExam(e.id);
                      await qc.invalidateQueries({
                        queryKey: ["cbt", "tutor", "exams"],
                      });
                    }}
                    className="grid size-9 place-items-center rounded-full border-[1.5px] border-ink-200 text-red-500 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {resultsFor === e.id ? (
                <div className="mt-4 border-t border-ink-100 pt-4">
                  {results.isLoading ? (
                    <p className="text-xs text-ink-500">Loading results…</p>
                  ) : (results.data ?? []).length === 0 ? (
                    <p className="text-xs text-ink-500">No sittings yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-ink-400">
                          <th className="py-2 font-bold">Student</th>
                          <th className="py-2 font-bold">Score</th>
                          <th className="py-2 font-bold">Outcome</th>
                          <th className="py-2 font-bold">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(results.data ?? []).map((a) => (
                          <tr
                            key={a.attempt_id}
                            className="border-t border-ink-50"
                          >
                            <td className="py-2.5 font-semibold text-ink-700">
                              {a.student_name ?? "Student"}
                            </td>
                            <td className="py-2.5 font-display tabular-nums text-deep">
                              {a.score !== null && a.score !== undefined
                                ? `${a.score}%`
                                : "—"}
                            </td>
                            <td className="py-2.5">
                              {a.passed === true ? (
                                <span className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-bold text-deep">
                                  Passed
                                </span>
                              ) : a.passed === false ? (
                                <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                                  Below mark
                                </span>
                              ) : (
                                <span className="text-xs text-ink-400">
                                  In progress / expired
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-xs text-ink-500">
                              {a.submitted_at
                                ? new Date(a.submitted_at).toLocaleString(
                                    undefined,
                                    {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    },
                                  )
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-400">
        Students sit your papers at{" "}
        <Link
          href="/lms/exams"
          className="font-bold text-primary-dark hover:underline"
        >
          /lms/exams
        </Link>{" "}
        — timed, JAMB-style, graded instantly with your explanations.
      </p>
    </div>
  );
}
