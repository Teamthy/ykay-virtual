"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { cn } from "@/lib/utils";
import { isAdmin } from "@/hooks/useDashboardRoute";
import {
  getMyLessons,
  getCohort,
  listMyAssignments,
  listMySubmissions,
  getAttendanceSummary,
} from "@/features/lms/api";
import { listAssessments, listProgressReports } from "@/features/learning/api";
import {
  useSubjectNames,
  subjectName,
} from "@/features/learning/useSubjectNames";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { GraduationCap } from "lucide-react";

// Student LMS hub — my courses, attendance, assignments, quizzes, reports.

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-3xl font-extrabold text-deep">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-deep">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function LmsHomePage() {
  // G1: profile IDs resolve from the session server-side (no fixture UUIDs).
  const { user, context, isLoading } = useSession();
  const ready = !!user && !!context;
  const router = useRouter();

  // Role-aware routing: /lms is the LEARNER hub. A tutor landing here must be
  // sent to their own teaching console, and platform admins to the admin
  // console — a tutor must never see the student LMS (and vice versa).
  useEffect(() => {
    if (isLoading || !user) return;
    if (isAdmin(user.roles)) {
      router.replace("/admin");
      return;
    }
    if (user.roles.includes("TUTOR") && !user.roles.includes("STUDENT")) {
      router.replace("/lms/tutor");
    }
  }, [user, isLoading, router]);

  const lessons = useQuery({
    queryKey: ["lms", "my-lessons"],
    queryFn: () => getMyLessons(),
    enabled: ready,
  });
  const attendance = useQuery({
    queryKey: ["lms", "attendance"],
    queryFn: () => getAttendanceSummary(),
    enabled: ready,
  });
  const assignments = useQuery({
    queryKey: ["lms", "assignments"],
    queryFn: () => listMyAssignments(),
    enabled: ready,
  });
  const submissions = useQuery({
    queryKey: ["lms", "submissions"],
    queryFn: () => listMySubmissions(),
    enabled: ready,
  });
  const quizzes = useQuery({
    queryKey: ["lms", "quizzes"],
    queryFn: () => listAssessments(),
    enabled: ready,
  });
  const { map: subjectMap } = useSubjectNames();
  const reports = useQuery({
    queryKey: ["lms", "reports"],
    queryFn: () => listProgressReports(),
    enabled: ready,
  });

  const [cohortMeta, setCohortMeta] = React.useState<
    Record<string, { title: string; href: string }>
  >({});

  // Group lessons into courses (by cohort id), fetching cohort titles lazily.
  const courses = (() => {
    const map = new Map<string, NonNullable<typeof lessons.data>>();
    for (const l of lessons.data ?? []) {
      const cid = l.cohort_id ?? "none";
      const arr = map.get(cid) ?? [];
      arr.push(l);
      map.set(cid, arr);
    }
    return [...map.entries()].map(([cid, ls]) => ({
      cohortId: cid,
      lessons: ls,
    }));
  })();

  const loadCohort = async (cid: string) => {
    if (cid === "none" || cohortMeta[cid]) return;
    try {
      const c = await getCohort(cid);
      setCohortMeta((m) => ({
        ...m,
        [cid]: { title: c.title, href: `/lms/courses/${c.id}` },
      }));
    } catch {
      setCohortMeta((m) => ({
        ...m,
        [cid]: { title: "My course", href: "#" },
      }));
    }
  };
  courses.forEach((c) => void loadCohort(c.cohortId));

  const submittedIds = new Set(
    (submissions.data ?? []).map((s) => s.assignment_id),
  );
  const pending = (assignments.data ?? []).filter(
    (a) => !submittedIds.has(a.id),
  ).length;
  const graded = (submissions.data ?? []).filter(
    (s) => s.score !== undefined,
  ).length;
  const passed = (quizzes.data ?? []).filter(
    (q) => q.status === "PASSED" || q.status === "GRADED",
  ).length;

  return (
    <DashboardPage>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">My courses</h2>
          <p className="text-sm text-ink-500">
            Track live classes, assignments and course access from one place.
          </p>
        </div>
        <Link
          href="/cohorts"
          className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-primary"
        >
          Browse cohorts
        </Link>
      </div>
      <div>
        <RoleGate page="/lms" />
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            label="Active courses"
            value={courses.length || "—"}
            hint="Cohorts you're enrolled in"
          />
          <Stat
            label="Attendance"
            value={attendance.data ? `${attendance.data.rate}%` : "—"}
            hint="Across tracked lessons"
          />
          <Stat
            label="Assignments due"
            value={pending}
            hint={`${graded} graded so far`}
          />
          <Stat
            label="Quizzes passed"
            value={passed}
            hint="Auto-graded assessments"
          />
        </div>

        {/* Courses */}
        <Section
          title="My courses"
          action={
            <Link
              href="/cohorts"
              className="text-sm font-semibold text-primary-dark hover:underline"
            >
              View all →
            </Link>
          }
        >
          {lessons.isLoading ? (
            <p className="py-8 text-center text-sm text-ink-500">
              Loading your courses…
            </p>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <GraduationCap size={28} className="text-deep" />
              <p className="mt-2 font-semibold text-ink-700">
                You&apos;re not enrolled in any course yet.
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Explore programmes and join a cohort to get started.
              </p>
              <Link
                href="/programmes"
                className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-primary-hover"
              >
                Browse programmes
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((c) => {
                const meta = cohortMeta[c.cohortId] ?? {
                  title: "My course",
                  href: `/lms/courses/${c.cohortId}`,
                };
                const next = c.lessons[0];
                const done = c.lessons.filter(
                  (l) => l.status === "COMPLETED",
                ).length;
                const pct = c.lessons.length
                  ? Math.round((done / c.lessons.length) * 100)
                  : 0;
                return (
                  <article
                    key={c.cohortId}
                    className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft"
                  >
                    <div className="flex items-center justify-between bg-primary px-5 py-4 text-ink-900">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-900/70">
                          Cohort
                        </p>
                        <h3 className="font-display text-xl tracking-wide">
                          {meta.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                        Active
                      </span>
                    </div>
                    <div className="grid gap-4 p-5 md:grid-cols-[1fr_220px]">
                      <div>
                        {next && (
                          <p className="text-sm text-ink-600">{next.title}</p>
                        )}
                        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-400">
                          Progress
                        </p>
                        <div className="mt-1 flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-ink-100">
                            <div
                              className="h-2 rounded-full bg-deep"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-ink-800">
                            {pct}%
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {done} of {c.lessons.length} lessons completed
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-2xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
                          Last visited
                          <p className="font-bold text-ink-800">
                            Open LMS to continue
                          </p>
                        </div>
                        <div className="rounded-2xl bg-primary-light px-4 py-3 text-xs text-deep">
                          Next live class
                          <p className="font-bold">
                            {next
                              ? new Date(next.start_at).toLocaleString([], {
                                  weekday: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Check schedule"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={meta.href}
                      className="flex h-12 items-center justify-center gap-2 bg-deep text-sm font-bold text-white hover:bg-deep-light"
                    >
                      Continue learning
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </Section>

        {/* Assignments */}
        <Section
          title="Assignments"
          action={
            <Link
              href="/lms"
              className="text-sm font-semibold text-primary-dark hover:underline"
            >
              Manage →
            </Link>
          }
        >
          {assignments.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-500">Loading…</p>
          ) : (assignments.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
              No assignments yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
              {(assignments.data ?? []).map((a) => {
                const sub = (submissions.data ?? []).find(
                  (s) => s.assignment_id === a.id,
                );
                return (
                  <div
                    key={a.id}
                    className="flex w-full items-center justify-between gap-4 border-b border-ink-100 px-5 py-4 text-left last:border-0 hover:bg-[#F8EBCF]"
                  >
                    <div>
                      <p className="font-semibold text-ink-800">{a.title}</p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {a.due_at
                          ? `Due ${new Date(a.due_at).toLocaleDateString()}`
                          : "No deadline"}
                        {a.max_score ? ` · Max ${a.max_score} pts` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                        sub?.score !== undefined
                          ? "bg-green-100 text-green-700"
                          : sub
                            ? "bg-primary-light text-deep"
                            : "bg-ink-100 text-ink-500",
                      )}
                    >
                      {sub?.score !== undefined
                        ? `${sub.score}/${a.max_score ?? "—"} graded`
                        : sub
                          ? "Submitted"
                          : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Exams & quizzes */}
        <Section
          title="Exams & quizzes"
          action={
            <span className="flex gap-4">
              <Link
                href="/lms/practice"
                className="text-sm font-semibold text-primary-dark hover:underline"
              >
                Practice bank →
              </Link>
              <Link
                href="/lms/exams"
                className="text-sm font-semibold text-primary-dark hover:underline"
              >
                Practice exams →
              </Link>
            </span>
          }
        >
          {(quizzes.data ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
              <p className="text-sm text-ink-500">
                No course exams yet — your tutor will publish them. Meanwhile,{" "}
                <Link
                  href="/lms/practice"
                  className="font-bold text-primary-dark hover:underline"
                >
                  practise from the 2,000+ question bank →
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {(quizzes.data ?? []).map((q) => (
                <Link
                  key={q.id}
                  href={q.cohort_id ? `/lms/courses/${q.cohort_id}` : "/lms"}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm transition-colors hover:border-primary/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-800">{q.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-bold text-deep">
                        {subjectName(subjectMap, q.subject_id)}
                      </span>{" "}
                      Pass {q.pass_threshold}%
                      {q.due_at
                        ? ` · due ${new Date(q.due_at).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-bold text-ink-900">
                    Take exam
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Section>

        {/* Recent reports */}
        <Section title="Progress reports">
          {(reports.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
              No progress reports yet — your tutor will share them here.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(reports.data ?? []).map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-700">
                      {new Date(r.period_start).toLocaleDateString()} –{" "}
                      {new Date(r.period_end).toLocaleDateString()}
                    </p>
                    <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-bold text-deep">
                      ★ {r.overall_rating}/5
                    </span>
                  </div>
                  {r.strengths && (
                    <p className="mt-2 text-sm text-ink-600">
                      💪 {r.strengths}
                    </p>
                  )}
                  {r.recommendations && (
                    <p className="mt-1 text-sm text-ink-600">
                      🎯 {r.recommendations}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </DashboardPage>
  );
}
