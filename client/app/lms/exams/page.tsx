"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, TimerReset, Trophy, ClipboardCheck } from "lucide-react";
import { listMyAttempts, listMyExams } from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";

// /lms/exams — the student's CBT home: available practice papers on top,
// sitting history below. Papers without a cohort are open to every learner;
// cohort papers appear for enrolled students only (the server decides).

export default function PracticeExamsPage() {
  const exams = useQuery({
    queryKey: ["cbt", "exams"],
    queryFn: listMyExams,
    staleTime: 30_000,
  });
  const attempts = useQuery({
    queryKey: ["cbt", "attempts"],
    queryFn: listMyAttempts,
    staleTime: 15_000,
  });

  const papers = exams.data ?? [];

  return (
    <DashboardPage className="space-y-10">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
          Practice exams
        </p>
        <h1 className="mt-2 font-display text-4xl text-deep">
          Computer-based testing
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
          Timed CBT papers in the JAMB/WAEC style — sit them anywhere, get your
          score and a question-by-question review the moment you submit.
        </p>
      </div>

      {/* Shared practice bank */}
      <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-deep">
              Out of papers? Practice from the bank
            </h2>
            <p className="mt-1 max-w-xl text-sm text-ink-600">
              2,000+ JAMB/WAEC/NECO-style questions — a different random set
              every sitting, graded instantly with explanations.
            </p>
          </div>
          <Link
            href="/lms/practice"
            className="btn-primary inline-flex items-center gap-2"
          >
            Open practice bank →
          </Link>
        </div>
      </section>

      {/* Available papers */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-deep">Available papers</h2>
        {exams.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : papers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
            <ClipboardCheck size={28} className="mx-auto text-ink-300" />
            <p className="mt-3 text-sm text-ink-500">
              No practice papers are available to you yet — your tutors publish
              them here.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {papers.map((e) => (
              <Link
                key={e.id}
                href={`/lms/exams/${e.id}`}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  <span className="rounded-full bg-primary-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-deep">
                    {e.subject}
                  </span>
                  <p className="mt-3 font-bold leading-snug text-ink-800 group-hover:text-deep">
                    {e.title}
                  </p>
                  {e.description ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-500">
                      {e.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} /> {e.duration_minutes} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <TimerReset size={13} /> {e.question_count} questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy size={13} /> pass {e.passing_score}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Attempt history */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-deep">Your sittings</h2>
        {attempts.isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : (attempts.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
            No sittings yet — pick a paper above to begin.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/60 text-left text-xs uppercase tracking-wider text-ink-500">
                  <th className="px-5 py-3 font-bold">Paper</th>
                  <th className="px-5 py-3 font-bold">Score</th>
                  <th className="px-5 py-3 font-bold">Outcome</th>
                  <th className="px-5 py-3 font-bold">Submitted</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {(attempts.data ?? []).map((a) => {
                  return (
                    <tr
                      key={a.attempt_id}
                      className="border-b border-ink-50 last:border-0"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-ink-800">{a.exam_title}</p>
                        <p className="text-xs text-ink-400">{a.exam_subject}</p>
                      </td>
                      <td className="px-5 py-3.5 font-display text-lg tabular-nums text-deep">
                        {a.score !== null && a.score !== undefined
                          ? `${a.score}%`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {a.passed === true ? (
                          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold text-deep">
                            Passed
                          </span>
                        ) : a.passed === false ? (
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                            Below pass mark
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-ink-400">
                            {new Date(a.expires_at).getTime() > Date.now()
                              ? "In progress"
                              : "Expired"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-ink-500">
                        {a.submitted_at
                          ? new Date(a.submitted_at).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {a.submitted_at ? (
                          <Link
                            href={`/lms/exams/attempts/${a.attempt_id}`}
                            className="text-xs font-bold text-primary-dark hover:underline"
                          >
                            Review →
                          </Link>
                        ) : new Date(a.expires_at).getTime() > Date.now() ? (
                          <Link
                            href={`/lms/exams/${a.exam_id}`}
                            className="text-xs font-bold text-primary-dark hover:underline"
                          >
                            Resume →
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
