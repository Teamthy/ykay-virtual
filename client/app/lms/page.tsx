"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { cn } from "@/lib/utils";
import {
  getMyLessons,
  getCohortLessons,
  getCohort,
  listMyAssignments,
  listMySubmissions,
  getAttendanceSummary,

} from "@/features/lms/api";
import { listAssessments, listProgressReports } from "@/features/learning/api";
import { useSession } from "@/hooks/useSession";
import { RoleGate } from "@/components/dashboard/RoleGate";

// Student LMS hub — my courses, attendance, assignments, quizzes, reports.

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-3xl font-extrabold text-brand-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ink-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold tracking-[0.02em] text-brand-navy">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function LmsHomePage() {
  // G1: profile IDs resolve from the session server-side (no fixture UUIDs).
  const { user, context } = useSession();
  const ready = !!user && !!context;

  const lessons = useQuery({ queryKey: ["lms", "my-lessons"], queryFn: () => getMyLessons(), enabled: ready });
  const attendance = useQuery({ queryKey: ["lms", "attendance"], queryFn: () => getAttendanceSummary(), enabled: ready });
  const assignments = useQuery({ queryKey: ["lms", "assignments"], queryFn: () => listMyAssignments(), enabled: ready });
  const submissions = useQuery({ queryKey: ["lms", "submissions"], queryFn: () => listMySubmissions(), enabled: ready });
  const quizzes = useQuery({ queryKey: ["lms", "quizzes"], queryFn: () => listAssessments(), enabled: ready });
  const reports = useQuery({ queryKey: ["lms", "reports"], queryFn: () => listProgressReports(), enabled: ready });

  const [cohortMeta, setCohortMeta] = React.useState<Record<string, { title: string; href: string }>>({});

  // Group lessons into courses (by cohort id), fetching cohort titles lazily.
  const courses = (() => {
    const map = new Map<string, NonNullable<typeof lessons.data>>();
    for (const l of lessons.data ?? []) {
      const cid = l.cohort_id ?? "none";
      const arr = map.get(cid) ?? [];
      arr.push(l);
      map.set(cid, arr);
    }
    return [...map.entries()].map(([cid, ls]) => ({ cohortId: cid, lessons: ls }));
  })();

  const loadCohort = async (cid: string) => {
    if (cid === "none" || cohortMeta[cid]) return;
    try {
      const c = await getCohort(cid);
      setCohortMeta((m) => ({ ...m, [cid]: { title: c.title, href: `/lms/courses/${c.id}` } }));
    } catch {
      setCohortMeta((m) => ({ ...m, [cid]: { title: "My course", href: "#" } }));
    }
  };
  courses.forEach((c) => void loadCohort(c.cohortId));

  const submittedIds = new Set((submissions.data ?? []).map((s) => s.assignment_id));
  const pending = (assignments.data ?? []).filter((a) => !submittedIds.has(a.id)).length;
  const graded = (submissions.data ?? []).filter((s) => s.score !== undefined).length;
  const passed = (quizzes.data ?? [])
    .filter((q) => q.status === "PASSED" || q.status === "GRADED")
    .length;

  return (
    <main className="min-h-screen bg-[#FFFCF5] pb-16">
      {/* Header */}
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">NUVORA</Link> / My learning
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">My Learning</h1>
              <p className="mt-1 text-sm text-ink-500">
                {user ? `Signed in as ${user.email}` : "Student portal"} — courses, assignments, quizzes and progress.
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/cohorts" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
                Browse cohorts
              </Link>
              <Link href="/lms/tutor" className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Tutor view
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <RoleGate page="/lms" />
        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Active courses" value={courses.length || "—"} hint="Cohorts you're enrolled in" />
          <Stat label="Attendance" value={attendance.data ? `${attendance.data.rate}%` : "—"} hint="Across tracked lessons" />
          <Stat label="Assignments due" value={pending} hint={`${graded} graded so far`} />
          <Stat label="Quizzes passed" value={passed} hint="Auto-graded assessments" />
        </div>

        {/* Courses */}
        <Section title="My courses" action={<Link href="/cohorts" className="text-sm font-semibold text-brand-gold-dark hover:underline">View all →</Link>}>
          {lessons.isLoading ? (
            <p className="py-8 text-center text-sm text-ink-400">Loading your courses…</p>
          ) : courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <p className="text-2xl">🎓</p>
              <p className="mt-2 font-semibold text-ink-700">You're not enrolled in any course yet.</p>
              <p className="mt-1 text-sm text-ink-500">Explore programmes and join a cohort to get started.</p>
              <Link href="/programmes" className="mt-4 inline-flex rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
                Browse programmes
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((c) => {
                const meta = cohortMeta[c.cohortId] ?? { title: "My course", href: `/lms/courses/${c.cohortId}` };
                const next = c.lessons[0];
                return (
                  <Link
                    key={c.cohortId}
                    href={meta.href}
                    className="group rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-brand-navy group-hover:text-brand-gold-dark">{meta.title}</h3>
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-navy">
                        {c.lessons.length} lessons
                      </span>
                    </div>
                    {next && (
                      <p className="mt-2 text-sm text-ink-500">
                        Next: <span className="font-semibold text-ink-700">{next.title}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-400">Open course →</p>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* Assignments */}
        <Section title="Assignments" action={<Link href="/lms" className="text-sm font-semibold text-brand-gold-dark hover:underline">Manage →</Link>}>
          {assignments.isLoading ? (
            <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
          ) : (assignments.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">No assignments yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
              {(assignments.data ?? []).map((a) => {
                const sub = (submissions.data ?? []).find((s) => s.assignment_id === a.id);
                return (
                  <div
                    key={a.id}
                    className="flex w-full items-center justify-between gap-4 border-b border-ink-100 px-5 py-4 text-left last:border-0 hover:bg-[#FFF8E8]"
                  >
                    <div>
                      <p className="font-semibold text-ink-800">{a.title}</p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {a.due_at ? `Due ${new Date(a.due_at).toLocaleDateString()}` : "No deadline"}
                        {a.max_score ? ` · Max ${a.max_score} pts` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                        sub?.score !== undefined
                          ? "bg-green-100 text-green-700"
                          : sub
                          ? "bg-brand-gold-light text-brand-navy"
                          : "bg-ink-100 text-ink-500"
                      )}
                    >
                      {sub?.score !== undefined ? `${sub.score}/${a.max_score ?? "—"} graded` : sub ? "Submitted" : "Pending"}
                    </span>
                  </div>
                );
              })}
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
                <div key={r.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink-700">
                      {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                    </p>
                    <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                      ★ {r.overall_rating}/5
                    </span>
                  </div>
                  {r.strengths && <p className="mt-2 text-sm text-ink-600">💪 {r.strengths}</p>}
                  {r.recommendations && <p className="mt-1 text-sm text-ink-600">🎯 {r.recommendations}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

    </main>
  );
}
