"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, TimerReset, Trophy, ClipboardCheck } from "lucide-react";
import { listMyAttempts, listMyExams } from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="relative isolate overflow-hidden rounded-3xl bg-deep px-6 py-10 text-white md:px-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/home/ribs-green.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/90 to-transparent" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Course exams
          </p>
          <h1 className="mt-2 font-display text-4xl">Computer-based testing</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            Timed papers your tutors publish. Sit them anywhere, then open a
            question-by-question review with your score.
          </p>
          <Link
            href="/lms/practice"
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-deep hover:bg-primary-hover"
          >
            Open CBT Practice →
          </Link>
        </div>
      </div>

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
              No course papers yet. Use CBT Practice to sit a subject paper
              while you wait for your tutor.
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

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-deep">Your results</h2>
        {attempts.isLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : (attempts.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
            No sittings yet — pick a paper above, or start CBT Practice.
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
                {(attempts.data ?? []).map((a) => (
                  <tr key={a.attempt_id} className="border-b border-ink-50 last:border-0">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-ink-800">{a.exam_title}</p>
                      <p className="text-xs text-ink-400">{a.exam_subject}</p>
                    </td>
                    <td className="px-5 py-3.5 font-display text-lg tabular-nums text-deep">
                      {a.score !== null && a.score !== undefined ? `${a.score}%` : "—"}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardPage>
  );
}
