"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { getAttemptReview } from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";

// /lms/exams/attempts/[attemptId] — the review of a submitted sitting: score,
// pass/fail against the paper's mark, and every question with your answer,
// the correct answer and the tutor's explanation.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default function AttemptReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const review = useQuery({
    queryKey: ["cbt", "review", attemptId],
    queryFn: () => getAttemptReview(attemptId),
    staleTime: 60_000,
    retry: false,
  });

  const r = review.data;

  return (
    <DashboardPage className="space-y-6">
      <Link
        href="/lms/exams"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"
      >
        <ArrowLeft size={15} /> Practice exams
      </Link>

      {review.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : review.error || !r ? (
        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center">
          <AlertTriangle size={28} className="mx-auto text-orange-500" />
          <p className="mt-3 font-bold text-ink-800">Review not available</p>
          <p className="mt-1 text-sm text-ink-500">
            {review.error instanceof Error
              ? review.error.message
              : "Please try again later."}
          </p>
        </div>
      ) : (
        <>
          <div
            className={`rounded-3xl border p-8 text-center shadow-sm ${
              r.passed
                ? "border-primary/50 bg-primary-light/60"
                : "border-orange-200 bg-orange-50"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
              {r.exam_subject} · {r.exam_title}
            </p>
            <p className="mt-3 font-display text-6xl text-deep">{r.score}%</p>
            <p className="mt-2 text-sm font-bold text-ink-700">
              {r.correct} of {r.total} correct ·{" "}
              {r.passed ? (
                <span className="text-primary-dark">PASSED</span>
              ) : (
                <span className="text-orange-700">
                  Below the {r.passing_score}% pass mark
                </span>
              )}
            </p>
            {r.expired ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-500">
                <AlertTriangle size={13} /> time expired — auto-submitted
              </p>
            ) : null}
            <p className="mt-2 text-xs text-ink-400">
              Submitted{" "}
              {new Date(r.submitted_at).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div className="space-y-4">
            {r.questions.map((q, i) => {
              const ok = q.chosen_index === q.correct_index;
              return (
                <div
                  key={q.id}
                  className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0">
                      {ok ? (
                        <CheckCircle2 size={18} className="text-primary-dark" />
                      ) : (
                        <XCircle size={18} className="text-red-500" />
                      )}
                    </span>
                    <p className="text-sm font-bold leading-relaxed text-ink-800">
                      {i + 1}. {q.text}
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1.5 pl-8">
                    {q.options.map((opt, oi) => (
                      <li
                        key={oi}
                        className={`rounded-lg px-3 py-2 text-sm ${
                          oi === q.correct_index
                            ? "bg-primary-light font-semibold text-deep"
                            : oi === q.chosen_index
                              ? "bg-red-50 font-semibold text-red-700"
                              : "text-ink-600"
                        }`}
                      >
                        {LETTERS[oi]}. {opt}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 pl-8 text-xs leading-5 text-ink-500">
                    {q.chosen_index === null ? (
                      <b className="text-orange-700">
                        You did not answer this question.{" "}
                      </b>
                    ) : null}
                    {q.explanation ? `Explanation: ${q.explanation}` : null}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardPage>
  );
}
