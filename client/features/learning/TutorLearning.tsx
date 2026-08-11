"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { listCohorts } from "@/features/cohorts/api/list";
import { getCohortAssignments } from "@/features/cohorts/api/lessons";
import { createProgressReport, gradeSubmission, listProgressReports, listSubmissions } from "./api";
import { STUDENT_ID } from "./StudentQuizzes";

// Tutor learning surface (working-doc §13): gradebook (score + feedback per
// submission) and progress-report writer (released to student + linked parent).

export const TUTOR_PROFILE_ID = "00000000-0000-0000-0000-000000000102";

export function TutorGradebook() {
  const qc = useQueryClient();
  const [cohortId, setCohortId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const cohorts = useQuery({ queryKey: ["tutor", "cohorts"], queryFn: () => listCohorts({}), staleTime: 60_000 });
  const cohortList = (cohorts.data?.data ?? []).filter((c) => c.id);

  const assignments = useQuery({
    queryKey: ["tutor", "cohort-assignments", cohortId],
    queryFn: () => (cohortId ? getCohortAssignments(cohortId) : Promise.resolve([])),
    enabled: !!cohortId,
    staleTime: 30_000,
  });

  const submissions = useQuery({
    queryKey: ["tutor", "submissions", assignmentId],
    queryFn: () => (assignmentId ? listSubmissions(assignmentId) : Promise.resolve([])),
    enabled: !!assignmentId,
    staleTime: 30_000,
  });

  const grade = useMutation({
    mutationFn: ({ id, score, note }: { id: string; score: number; note?: string }) =>
      gradeSubmission(id, score, note),
    onSuccess: () => {
      toast.success("Submission graded — student notified.");
      qc.invalidateQueries({ queryKey: ["tutor", "submissions", assignmentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not grade"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Gradebook</h2>
        <p className="text-sm text-ink-500">Score submissions and leave feedback — results release to the student.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-ink-500">Cohort</span>
          <select
            value={cohortId}
            onChange={(e) => {
              setCohortId(e.target.value);
              setAssignmentId("");
            }}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">Select a cohort…</option>
            {cohortList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-500">Assignment</span>
          <select
            value={assignmentId}
            onChange={(e) => setAssignmentId(e.target.value)}
            disabled={!cohortId || assignments.isLoading}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Select an assignment…</option>
            {(assignments.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {assignmentId && (
        <div className="space-y-3">
          {submissions.isLoading && <Skeleton className="h-24" />}
          {(submissions.data ?? []).map((sub) => (
            <Card key={sub.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-400">
                      Student {sub.student_profile_id.slice(0, 8)} · submitted{" "}
                      {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-ink-700 line-clamp-3">{sub.content ?? "—"}</p>
                    {sub.score !== undefined && (
                      <p className="mt-2 text-sm font-semibold text-green-600">
                        Scored {sub.score} · {sub.feedback}
                      </p>
                    )}
                  </div>
                  <div className="w-full md:w-64 space-y-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Score (0–100)"
                      value={scores[sub.id] ?? ""}
                      onChange={(e) => setScores((m) => ({ ...m, [sub.id]: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                    <input
                      placeholder="Feedback…"
                      value={feedback[sub.id] ?? ""}
                      onChange={(e) => setFeedback((m) => ({ ...m, [sub.id]: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={grade.isPending || !scores[sub.id]}
                      onClick={() =>
                        grade.mutate({
                          id: sub.id,
                          score: Number(scores[sub.id]),
                          note: feedback[sub.id] || undefined,
                        })
                      }
                    >
                      {grade.isPending ? "Grading…" : sub.score !== undefined ? "Regrade" : "Grade"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!submissions.isLoading && (submissions.data ?? []).length === 0 && (
            <EmptyState
              icon={<Inbox size={20} />}
              title="No submissions yet"
              description="When students submit this assignment it will appear here for grading."
            />
          )}
        </div>
      )}
    </div>
  );
}

export function TutorProgressReports() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    student_profile_id: STUDENT_ID,
    period_start: "",
    period_end: "",
    strengths: "",
    weaknesses: "",
    recommendations: "",
    overall_rating: 4,
  });

  const reports = useQuery({
    queryKey: ["tutor", "progress-reports"],
    queryFn: () => listProgressReports(undefined, TUTOR_PROFILE_ID),
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: () =>
      createProgressReport({
        tutor_profile_id: TUTOR_PROFILE_ID,
        student_profile_id: form.student_profile_id,
        period_start: form.period_start,
        period_end: form.period_end,
        strengths: form.strengths || undefined,
        weaknesses: form.weaknesses || undefined,
        recommendations: form.recommendations || undefined,
        overall_rating: form.overall_rating,
      }),
    onSuccess: () => {
      toast.success("Progress report released to student + linked parent.");
      qc.invalidateQueries({ queryKey: ["tutor", "progress-reports"] });
      qc.invalidateQueries({ queryKey: ["student", "progress-reports"] });
      setForm((f) => ({ ...f, strengths: "", weaknesses: "", recommendations: "" }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create report"),
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Progress reports</h2>
        <p className="text-sm text-ink-500">Write term/period reports — visible to the student and their linked parent.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Student profile ID</span>
              <input
                value={form.student_profile_id}
                onChange={(e) => set("student_profile_id", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Period start</span>
              <input
                type="date"
                value={form.period_start}
                onChange={(e) => set("period_start", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Period end</span>
              <input
                type="date"
                value={form.period_end}
                onChange={(e) => set("period_end", e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Strengths</span>
              <textarea
                value={form.strengths}
                onChange={(e) => set("strengths", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Areas to improve</span>
              <textarea
                value={form.weaknesses}
                onChange={(e) => set("weaknesses", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-500">Recommendations</span>
              <textarea
                value={form.recommendations}
                onChange={(e) => set("recommendations", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-ink-500">Overall rating</span>
              <select
                value={form.overall_rating}
                onChange={(e) => set("overall_rating", Number(e.target.value))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <Button
              disabled={create.isPending || !form.period_start || !form.period_end}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Releasing…" : "Release report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Recently written</h3>
        {reports.isLoading && <Skeleton className="h-20" />}
        {(reports.data ?? []).slice(0, 5).map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                </p>
                <p className="text-xs text-ink-500">Student {r.student_profile_id.slice(0, 8)} · {r.strengths ?? "no notes"}</p>
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">{r.overall_rating}/5</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
