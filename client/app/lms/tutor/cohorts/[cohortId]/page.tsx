"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCohort,
  getCohortLessons,
  getCohortAssignments,
  getCohortResources,
  getCohortEnrollments,
  createCohortAssignment,
  createCohortResource,
  createAssessment,
  getLessonAttendance,
  markAttendance,
  type AttendanceRow,
} from "@/features/lms/api";
import {
  listSubmissions,
  gradeSubmission,
  listAssessments,
  createProgressReport,
  type GradedSubmission,
} from "@/features/learning/api";

// Tutor cohort console - attendance, submissions grading, quiz list and
// progress-report creation for one cohort.

export default function LmsTutorCohortPage() {
  const params = useParams<{ cohortId: string }>();
  const cohortId = params.cohortId;
  const qc = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [report, setReport] = useState({ strengths: "", weaknesses: "", recommendations: "", rating: "4" });
  const [reportStudentId, setReportStudentId] = useState("");

  // Authoring forms (LMS beyond MVP)
  const [quizDraft, setQuizDraft] = useState({
    title: "",
    instructions: "",
    pass_threshold: "70",
    questions: [{ question: "", options: ["", "", "", ""], correct_index: 0 }],
  });
  const [assignmentDraft, setAssignmentDraft] = useState({ title: "", instructions: "", max_score: "10" });
  const [resourceDraft, setResourceDraft] = useState({ title: "", description: "", file_url: "" });
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);

  const roster = useQuery({
    queryKey: ["lms", "roster", cohortId],
    queryFn: () => getCohortEnrollments(cohortId),
  });
  const resources = useQuery({
    queryKey: ["lms", "resources", cohortId],
    queryFn: () => getCohortResources(cohortId),
  });

  const createQuiz = useMutation({
    mutationFn: () =>
      createAssessment({
        cohort_id: cohortId,
        title: quizDraft.title,
        instructions: quizDraft.instructions || undefined,
        pass_threshold: Number(quizDraft.pass_threshold) || 70,
        questions: quizDraft.questions
          .filter((q) => q.question.trim())
          .map((q) => ({ question: q.question, options: q.options, correct_index: q.correct_index })),
      }),
    onSuccess: () => {
      toast.success("Quiz published");
      setShowQuizBuilder(false);
      setQuizDraft({ title: "", instructions: "", pass_threshold: "70", questions: [{ question: "", options: ["", "", "", ""], correct_index: 0 }] });
      qc.invalidateQueries({ queryKey: ["lms", "quizzes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create quiz"),
  });

  const createAssignment = useMutation({
    mutationFn: () =>
      createCohortAssignment(cohortId, {
        title: assignmentDraft.title,
        instructions: assignmentDraft.instructions || undefined,
        max_score: Number(assignmentDraft.max_score) || undefined,
      }),
    onSuccess: () => {
      toast.success("Assignment published");
      setShowAssignmentForm(false);
      setAssignmentDraft({ title: "", instructions: "", max_score: "10" });
      qc.invalidateQueries({ queryKey: ["lms", "assignments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create assignment"),
  });

  const createResource = useMutation({
    mutationFn: () =>
      createCohortResource(cohortId, {
        title: resourceDraft.title,
        description: resourceDraft.description || undefined,
        file_url: resourceDraft.file_url || undefined,
      }),
    onSuccess: () => {
      toast.success("Resource added");
      setShowResourceForm(false);
      setResourceDraft({ title: "", description: "", file_url: "" });
      qc.invalidateQueries({ queryKey: ["lms", "resources"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create resource"),
  });

  const cohort = useQuery({ queryKey: ["lms", "cohort", cohortId], queryFn: () => getCohort(cohortId) });
  const lessons = useQuery({ queryKey: ["lms", "lessons", cohortId], queryFn: () => getCohortLessons(cohortId) });
  const assignments = useQuery({ queryKey: ["lms", "assignments", cohortId], queryFn: () => getCohortAssignments(cohortId) });
  const quizzes = useQuery({ queryKey: ["lms", "quizzes", cohortId], queryFn: () => listAssessments(cohortId) });

  const lessonId = selectedLessonId || lessons.data?.[0]?.id || "";
  const attendanceRows = useQuery({
    queryKey: ["lms", "attendance", lessonId],
    queryFn: () => getLessonAttendance(lessonId),
    enabled: !!lessonId,
  });

  const submissions = useQuery({
    queryKey: ["lms", "submissions", assignments.data?.[0]?.id],
    queryFn: () => listSubmissions(assignments.data![0].id),
    enabled: (assignments.data?.length ?? 0) > 0,
  });

  const mark = useMutation({
    mutationFn: (row: AttendanceRow) =>
      markAttendance(lessonId, {
        student_profile_id: row.student_profile_id,
        status: attendance[row.student_profile_id] ?? "PRESENT",
      }),
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries({ queryKey: ["lms", "attendance"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update attendance"),
  });

  const gradeIt = useMutation({
    mutationFn: (s: GradedSubmission) => gradeSubmission(s.id, Number(grade[s.id] ?? 0), feedback[s.id] || undefined),
    onSuccess: () => {
      toast.success("Submission graded");
      qc.invalidateQueries({ queryKey: ["lms", "submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not grade"),
  });

  const createReport = useMutation({
    mutationFn: () =>
      createProgressReport({
        student_profile_id: reportStudentId,
        period_start: new Date(Date.now() - 7 * 864e5).toISOString(),
        period_end: new Date().toISOString(),
        strengths: report.strengths,
        weaknesses: report.weaknesses,
        recommendations: report.recommendations,
        overall_rating: Number(report.rating),
      }),
    onSuccess: () => {
      toast.success("Progress report created");
      setReport({ strengths: "", weaknesses: "", recommendations: "", rating: "4" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create report"),
  });

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/lms/tutor" className="hover:text-brand-gold-dark">My Teaching</Link> /{" "}
            <span className="text-ink-600">{cohort.data?.title ?? "Cohort"}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">
                {cohort.data?.title ?? "Loading cohort..."}
              </h1>
              <p className="mt-1 text-sm text-ink-500">
                Teaching console - attendance, grading and reports.
                {cohort.data ? `  |  ${cohort.data.enrolled_count} enrolled` : ""}
              </p>
            </div>
            <Link href="/lms/tutor" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
              ← Back to My Teaching
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Attendance console */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Attendance</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(lessons.data ?? []).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLessonId(l.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-bold",
                    lessonId === l.id ? "bg-brand-navy text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  )}
                >
                  {l.title}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {(attendanceRows.data ?? []).map((row) => (
                <div key={row.student_profile_id} className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
                    {row.student_profile_id.slice(-2).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold text-ink-700">{row.student_profile_id}</span>
                  <select
                    className="rounded-lg border border-ink-200 px-2 py-1.5 text-xs font-semibold text-ink-700 focus:border-brand-gold focus:outline-none"
                    value={attendance[row.student_profile_id] ?? row.status}
                    onChange={(e) => setAttendance((m) => ({ ...m, [row.student_profile_id]: e.target.value }))}
                  >
                    {["PRESENT", "LATE", "ABSENT", "EXCUSED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={mark.isPending}
                    onClick={() => mark.mutate(row)}
                    className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                  >
                    Save
                  </button>
                </div>
              ))}
              {(attendanceRows.data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-ink-400">
                  No attendance records for this lesson yet. {lessonId ? "Try another lesson." : ""}
                </p>
              )}
            </div>
          </section>

          {/* Grading console */}
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Grading</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(assignments.data ?? []).map((a) => (
                <span key={a.id} className="rounded-lg bg-brand-gold-light px-3 py-1.5 text-xs font-bold text-brand-navy">
                  {a.title}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {(submissions.data ?? []).map((s) => (
                <div key={s.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-700">Submission {s.student_profile_id.slice(-4)}</span>
                    {s.score !== undefined ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                        {s.score}/10 graded
                      </span>
                    ) : (
                      <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold text-ink-500">Pending</span>
                    )}
                  </div>
                  {s.content && <p className="mt-2 rounded-lg bg-[#FFF7E4] p-3 text-sm text-ink-600">{s.content}</p>}
                  {s.feedback && <p className="mt-1 text-xs text-ink-400">Feedback: {s.feedback}</p>}
                  <div className="mt-3 flex gap-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      placeholder="Score /10"
                      className="h-10 w-24 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                      value={grade[s.id] ?? s.score ?? ""}
                      onChange={(e) => setGrade((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Feedback..."
                      className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                      value={feedback[s.id] ?? s.feedback ?? ""}
                      onChange={(e) => setFeedback((m) => ({ ...m, [s.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      disabled={gradeIt.isPending || grade[s.id] === "" && s.score === undefined}
                      onClick={() => gradeIt.mutate(s)}
                      className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                    >
                      Grade
                    </button>
                  </div>
                </div>
              ))}
              {(submissions.data ?? []).length === 0 && (
                <p className="py-6 text-center text-sm text-ink-400">No submissions to grade yet.</p>
              )}
            </div>
          </section>
        </div>

        {/* Roster */}
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brand-navy">Class roster ({cohort.data?.enrolled_count ?? roster.data?.length ?? "-"})</h2>
            <span className="text-xs text-ink-400">Learners enrolled in this cohort</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-4">Learner</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {(roster.data ?? []).map((r) => (
                  <tr key={r.student_profile_id} className="border-b border-ink-50 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold text-ink-800">{r.name || r.student_profile_id.slice(0, 8) + "..."}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-0.5 text-xs font-bold text-brand-navy">{r.status}</span>
                    </td>
                    <td className="py-2.5 text-ink-500">{new Date(r.enrolled_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(roster.data ?? []).length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-ink-400">No enrollments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Authoring console */}
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-brand-navy">Create content</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowQuizBuilder((v) => !v)} className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-navy/90">+ Quiz</button>
              <button type="button" onClick={() => setShowAssignmentForm((v) => !v)} className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover">+ Assignment</button>
              <button type="button" onClick={() => setShowResourceForm((v) => !v)} className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-700 hover:border-ink-300">+ Resource</button>
            </div>
          </div>

          {showQuizBuilder && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">New quiz</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Quiz title" placeholder="Quiz title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.title} onChange={(e) => setQuizDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Quiz instructions" placeholder="Instructions" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.instructions} onChange={(e) => setQuizDraft((d) => ({ ...d, instructions: e.target.value }))} />
                <input type="number" aria-label="Pass percentage" placeholder="Pass %" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={quizDraft.pass_threshold} onChange={(e) => setQuizDraft((d) => ({ ...d, pass_threshold: e.target.value }))} />
              </div>
              <div className="space-y-3">
                {quizDraft.questions.map((q, qi) => (
                  <div key={qi} className="rounded-lg border border-ink-100 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink-400">Q{qi + 1}</span>
                      <input type="text" aria-label="Question text" placeholder="Question" className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={q.question} onChange={(e) => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, question: e.target.value } : x)) }))} />
                      <button type="button" onClick={() => setQuizDraft((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== qi) }))} className="text-xs font-bold text-red-500">✕</button>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input type="radio" checked={q.correct_index === oi} onChange={() => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, correct_index: oi } : x)) }))} title="Correct answer" />
                          <input type="text" placeholder={`Option ${String.fromCharCode(65 + oi)}`} className="h-9 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={opt} onChange={(e) => setQuizDraft((d) => ({ ...d, questions: d.questions.map((x, i) => (i === qi ? { ...x, options: x.options.map((o, j) => (j === oi ? e.target.value : o)) } : x)) }))} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setQuizDraft((d) => ({ ...d, questions: [...d.questions, { question: "", options: ["", "", "", ""], correct_index: 0 }] }))} className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-bold text-ink-600 hover:border-ink-300">+ Add question</button>
                <button type="button" disabled={createQuiz.isPending || !quizDraft.title.trim() || quizDraft.questions.filter((q) => q.question.trim()).length === 0} onClick={() => createQuiz.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                  {createQuiz.isPending ? "Publishing..." : "Publish quiz"}
                </button>
              </div>
            </div>
          )}

          {showAssignmentForm && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">New assignment</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Assignment title" placeholder="Title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.title} onChange={(e) => setAssignmentDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Quiz instructions" placeholder="Instructions" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.instructions} onChange={(e) => setAssignmentDraft((d) => ({ ...d, instructions: e.target.value }))} />
                <input type="number" aria-label="Max score" placeholder="Max score" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={assignmentDraft.max_score} onChange={(e) => setAssignmentDraft((d) => ({ ...d, max_score: e.target.value }))} />
              </div>
              <button type="button" disabled={createAssignment.isPending || !assignmentDraft.title.trim()} onClick={() => createAssignment.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                {createAssignment.isPending ? "Publishing..." : "Publish assignment"}
              </button>
            </div>
          )}

          {(resources.data ?? []).length > 0 && (
            <ul className="mt-4 space-y-2">
              {(resources.data ?? []).map((r) => {
                const url = r.file_url ?? "";
                const yt = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]{6,})/);
                return (
                  <li key={r.id} className="rounded-xl border border-ink-100 p-3">
                    <p className="text-sm font-semibold text-ink-800">{r.title}</p>
                    {r.description ? <p className="text-xs text-ink-500">{r.description}</p> : null}
                    {yt ? (
                      <div className="mt-2 overflow-hidden rounded-lg bg-black aspect-video">
                        <iframe title={r.title} className="h-full w-full" src={`https://www.youtube.com/embed/${yt[1]}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ) : url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-bold text-brand-navy underline">Open file / video</a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {showResourceForm && (
            <div className="mt-4 space-y-3 rounded-xl border border-ink-100 p-4">
              <p className="text-sm font-bold text-ink-700">Material or video</p>
              <p className="text-xs text-ink-500">Paste a YouTube, Drive, or file URL. Hosting video files on this server is not enabled on the free plan.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <input type="text" aria-label="Resource title" placeholder="Title" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.title} onChange={(e) => setResourceDraft((d) => ({ ...d, title: e.target.value }))} />
                <input type="text" aria-label="Resource description" placeholder="Description" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.description} onChange={(e) => setResourceDraft((d) => ({ ...d, description: e.target.value }))} />
                <input type="url" aria-label="File or video URL" placeholder="https://youtube.com/watch?v=... or file URL" className="h-10 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none" value={resourceDraft.file_url} onChange={(e) => setResourceDraft((d) => ({ ...d, file_url: e.target.value }))} />
              </div>
              <button type="button" disabled={createResource.isPending || !resourceDraft.title.trim()} onClick={() => createResource.mutate()} className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40">
                {createResource.isPending ? "Adding..." : "Add material"}
              </button>
            </div>
          )}
        </section>

        {/* Quizzes + progress report */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">Quizzes in this cohort</h2>
            <div className="mt-3 space-y-2">
              {(quizzes.data ?? []).map((q) => (
                <div key={q.id} className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{q.title}</p>
                    <p className="text-xs text-ink-400">Pass {q.pass_threshold}%  |  {q.status}</p>
                  </div>
                  <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-navy">Auto-graded</span>
                </div>
              ))}
              {(quizzes.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-ink-400">No quizzes yet.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold text-brand-navy">New progress report</h2>
            <div className="mt-3 space-y-3">
              <select
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={reportStudentId}
                onChange={(e) => setReportStudentId(e.target.value)}
              >
                <option value="">Select learner...</option>
                {(roster.data ?? []).map((r) => (
                  <option key={r.student_profile_id} value={r.student_profile_id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Strengths (e.g. strong grasp of algebra)"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.strengths}
                onChange={(e) => setReport((r) => ({ ...r, strengths: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Weaknesses"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.weaknesses}
                onChange={(e) => setReport((r) => ({ ...r, weaknesses: e.target.value }))}
              />
              <input
                type="text"
                placeholder="Recommendations"
                className="h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                value={report.recommendations}
                onChange={(e) => setReport((r) => ({ ...r, recommendations: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-500">Rating:</span>
                {["1", "2", "3", "4", "5"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReport((r) => ({ ...r, rating: n }))}
                    className={cn(
                      "grid size-9 place-items-center rounded-full text-sm font-bold",
                      report.rating === n ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-500"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={createReport.isPending || !report.strengths || !reportStudentId}
                onClick={() => createReport.mutate()}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
              >
                {createReport.isPending ? "Creating..." : "Publish report"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
