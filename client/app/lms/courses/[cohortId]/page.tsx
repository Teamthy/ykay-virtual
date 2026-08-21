"use client";

import Link from "next/link";
import { BookOpen, PartyPopper } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/PageHeader";
import {
  getCohort,
  getCohortLessons,
  getCohortResources,
  getCohortAssignments,
  getLessonNotes,
  addLessonNote,
  getLessonAttendance,
  submitAssignment,
  listAssessments,
  startAssessment,
  submitAssessment,
  recordLessonProgress,
  type AssessmentStart,
  type AssessmentResult,
  type CohortLesson,
} from "@/features/lms/api";
import { listProgressReports } from "@/features/learning/api";
import { useSubjectNames, subjectName } from "@/features/learning/useSubjectNames";

// Student course page - lessons, resources, assignments, auto-graded quiz,
// notes and progress reports for one cohort.

type QuizState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "taking"; data: AssessmentStart; answers: Record<string, number> }
  | { phase: "grading" }
  | { phase: "done"; result: AssessmentResult };

export default function LmsCoursePage() {
  const params = useParams<{ cohortId: string }>();
  const cohortId = params.cohortId;
  const qc = useQueryClient();
  // G1: the learner identity is session-resolved server-side.
  const { context } = useSession();
  const studentId = context?.student?.id;

  const [quiz, setQuiz] = useState<QuizState>({ phase: "idle" });
  const [noteText, setNoteText] = useState("");
  const [submitText, setSubmitText] = useState<Record<string, string>>({});
  const [attendanceFilter, setAttendanceFilter] = useState<string>("all");
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const cohort = useQuery({ queryKey: ["lms", "cohort", cohortId], queryFn: () => getCohort(cohortId) });
  const lessons = useQuery({ queryKey: ["lms", "lessons", cohortId], queryFn: () => getCohortLessons(cohortId) });
  const resources = useQuery({ queryKey: ["lms", "resources", cohortId], queryFn: () => getCohortResources(cohortId) });
  const assignments = useQuery({ queryKey: ["lms", "assignments", cohortId], queryFn: () => getCohortAssignments(cohortId) });
  const quizzes = useQuery({ queryKey: ["lms", "quizzes", cohortId], queryFn: () => listAssessments(cohortId) });
  const { map: subjectMap } = useSubjectNames();
  const reports = useQuery({ queryKey: ["lms", "reports", cohortId], queryFn: () => listProgressReports() });
  const notes = useQuery({
    queryKey: ["lms", "notes", cohortId],
    queryFn: async () => {
      const ls = await getCohortLessons(cohortId);
      const out = [];
      for (const l of ls) out.push(...(await getLessonNotes(l.id)));
      return out;
    },
    enabled: lessons.isFetched,
  });

  // Attendance across the cohort's lessons for this student.
  const attendance = useQuery({
    queryKey: ["lms", "attendance", cohortId],
    queryFn: async () => {
      const ls = await getCohortLessons(cohortId);
      const rows = [];
      for (const l of ls) rows.push(...(await getLessonAttendance(l.id)));
      return rows.filter((r) => r.student_profile_id === studentId);
    },
    enabled: lessons.isFetched,
  });

  const quizzesPassed = (quizzes.data ?? []).filter((q) => q.status === "PASSED" || q.status === "GRADED").length;
  const quizzesTotal = (quizzes.data ?? []).length;

  // Auto-select the first lesson once lessons load (course-taking default).
  useEffect(() => {
    if (!activeLessonId && (lessons.data?.length ?? 0) > 0) {
      setActiveLessonId(lessons.data![0].id);
    }
  }, [lessons.data, activeLessonId]);

  const startQuiz = useMutation({
    mutationFn: (id: string) => startAssessment(id, studentId),
    onSuccess: (data) => setQuiz({ phase: "taking", data, answers: {} }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start the quiz"),
  });

  const gradeQuiz = useMutation({
    mutationFn: (payload: { id: string; answers: Record<string, number> }) =>
      submitAssessment(payload.id, studentId, Object.entries(payload.answers).map(([question_id, chosen_index]) => ({ question_id, chosen_index }))),
    onSuccess: (result) => {
      setQuiz({ phase: "done", result });
      qc.invalidateQueries({ queryKey: ["lms", "quizzes"] });
      toast.success(result.passed ? "Quiz passed - well done!" : "Quiz completed - review your weak spots.");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Could not submit the quiz");
      setQuiz((q) => (q.phase === "taking" ? q : q));
    },
  });

  const submit = useMutation({
    mutationFn: ({ assignmentId, content }: { assignmentId: string; content: string }) =>
      submitAssignment(studentId, assignmentId, content),
    onSuccess: () => {
      toast.success("Assignment submitted - your tutor will grade it.");
      setSubmitText({});
      qc.invalidateQueries({ queryKey: ["lms", "assignments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  const addNote = useMutation({
    mutationFn: (lessonId: string) =>
      addLessonNote(lessonId, { student_profile_id: studentId, content: noteText }),
    onSuccess: () => {
      toast.success("Note saved");
      setNoteText("");
      qc.invalidateQueries({ queryKey: ["lms", "notes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save note"),
  });

  const present = (attendance.data ?? []).filter((r) => r.status === "PRESENT").length;
  const late = (attendance.data ?? []).filter((r) => r.status === "LATE").length;
  const total = attendance.data?.length ?? 0;

  return (
    <main className="px-4 py-8 md:px-8">
      <PageHeader
        eyebrow="Student"
        title={cohort.data?.title ?? "Loading course…"}
        cover="/hero/exam-prep.jpg"
        subline={`${cohort.data?.start_date ? `${new Date(cohort.data.start_date).toLocaleDateString()} - ${new Date(cohort.data.end_date).toLocaleDateString()}` : ""}${cohort.data?.schedule_description ? ` · ${cohort.data.schedule_description}` : ""}${cohort.data?.location_mode ? ` · ${cohort.data.location_mode}` : ""}`}
        actions={
          <Link href="/lms" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-ink-300">
            ← Back to My Learning
          </Link>
        }
      />

      <div className="mx-auto max-w-6xl">
        {/* Progress charts */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Attendance per lesson */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-brand-navy">Attendance</h3>
            <div className="mt-3 flex items-end gap-1.5" style={{ height: 96 }}>
              {(lessons.data ?? []).slice(0, 8).map((l, i) => {
                const row = (attendance.data ?? []).find((a) => (attendance.data ?? [])[i]?.lesson_id === l.id);
                const present = row?.status === "PRESENT";
                const late = row?.status === "LATE";
                return (
                  <div key={l.id} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-bold">{row ? "✓" : "-"}</span>
                    <div
                      className={`w-full rounded-t ${present ? "bg-green-500" : late ? "bg-amber-400" : "bg-ink-200"}`}
                      style={{ height: row ? 56 : 16 }}
                      title={l.title}
                    />
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-ink-500">Last lessons · green = present, amber = late, grey = untracked</p>
          </div>

          {/* Quiz pass rate */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-brand-navy">Quizzes</h3>
            <p className="mt-2 text-3xl font-extrabold text-brand-navy">
              {quizzesTotal > 0 ? Math.round((quizzesPassed / quizzesTotal) * 100) : "-"}
              {quizzesTotal > 0 && <span className="text-base font-bold text-ink-500">% passed</span>}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-gold"
                style={{ width: quizzesTotal > 0 ? `${(quizzesPassed / quizzesTotal) * 100}%` : "0%" }}
              />
            </div>
            <p className="mt-2 text-[11px] text-ink-500">{quizzesPassed} of {quizzesTotal} quizzes passed</p>
          </div>

          {/* Report ratings */}
          <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-brand-navy">Tutor ratings</h3>
            <div className="mt-3 space-y-2">
              {(reports.data ?? []).slice(-4).map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] text-ink-500">
                    {new Date(r.period_start).toLocaleDateString(undefined, { month: "short" })}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-navy" style={{ width: `${(r.overall_rating / 5) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] font-bold text-brand-navy">★{r.overall_rating}</span>
                </div>
              ))}
              {(reports.data ?? []).length === 0 && <p className="py-6 text-center text-[11px] text-ink-500">No reports yet</p>}
            </div>
          </div>
        </div>

        {/* Attendance strip */}
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-ink-100 bg-white px-5 py-4 shadow-sm">
          <span className="text-sm font-bold text-brand-navy">Attendance</span>
          {["all", "PRESENT", "LATE", "ABSENT"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAttendanceFilter(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold capitalize",
                attendanceFilter === s ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-500 hover:bg-ink-200"
              )}
            >
              {s === "all" ? `All (${total})` : `${s.toLowerCase()} (${s === "PRESENT" ? present : s === "LATE" ? late : 0})`}
            </button>
          ))}
          <span className="ml-auto text-sm text-ink-500">
            Present {present} · Late {late} · {total ? Math.round(((present + late) / total) * 100) : 0}% tracked
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column */}
          <div className="space-y-6">
            {/* Course player - curriculum sidebar + persistent player */}
            <section className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
              <div className="grid lg:grid-cols-[300px_1fr]">
                {/* Curriculum sidebar */}
                <div className="border-b border-ink-100 bg-brand-navy p-4 text-white lg:border-b-0 lg:border-r">
                  <h2 className="px-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                    Course content
                  </h2>
                  <div className="mt-3 space-y-1">
                    {(lessons.data ?? []).map((l, i) => {
                      const active = activeLessonId === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                            active ? "bg-brand-gold font-semibold text-ink-900" : "text-white/80 hover:bg-white/10"
                          }`}
                        >
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                              active ? "bg-ink-900 text-white" : "bg-white/15 text-white"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="min-w-0 truncate">{l.title}</span>
                        </button>
                      );
                    })}
                    {(lessons.data ?? []).length === 0 && (
                      <p className="px-1 py-6 text-center text-sm text-white/80">No lessons yet</p>
                    )}
                  </div>

                  {resources.data && (resources.data.length > 0) && (
                    <>
                      <h2 className="mt-6 px-1 text-xs font-bold uppercase tracking-[0.18em] text-white/80">
                        Resources
                      </h2>
                      <div className="mt-3 space-y-1">
                        {resources.data.map((r) => (
                          <a
                            key={r.id}
                            href={r.file_url ?? "#"}
                            target={r.file_url ? "_blank" : undefined}
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                          >
                            <span>📄</span>
                            <span className="min-w-0 truncate">{r.title}</span>
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Player */}
                <div className="p-5">
                  {(() => {
                    const active = (lessons.data ?? []).find((l) => l.id === activeLessonId) ?? (lessons.data ?? [])[0];
                    if (!active) return <p className="py-16 text-center text-sm text-ink-500">Select a lesson to begin.</p>;
                    return (
                      <>
                        <div className="overflow-hidden rounded-xl border border-ink-200 bg-black">
                          <div className="flex aspect-video w-full items-center justify-center bg-brand-navy">
                            {active.video_url ? (
                              <video
                                key={active.id}
                                src={active.video_url}
                                controls
                                playsInline
                                className="h-full w-full object-contain"
                                onPlay={() => void recordLessonProgress(active.id, { watched: true, position_seconds: 0 })}
                                onPause={(e) => void recordLessonProgress(active.id, { watched: true, position_seconds: Math.floor(e.currentTarget.currentTime) })}
                              />
                            ) : active.meeting_url ? (
                              <iframe
                                src={active.meeting_url}
                                title={active.title}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            ) : (
                              <div className="px-6 py-10 text-center text-white/70">
                                <p className="text-lg font-bold text-white">{active.title}</p>
                                <p className="mt-1 text-sm">
                                  Live session · {new Date(active.start_at).toLocaleString()} · {active.timezone}
                                </p>
                                <p className="mt-3 text-xs text-white/80">The meeting link will unlock when the session goes live.</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold text-brand-navy">{active.title}</h3>
                            <p className="mt-0.5 text-xs text-ink-500">
                              {new Date(active.start_at).toLocaleString()} · {active.timezone}
                              {active.meeting_provider ? ` · ${active.meeting_provider}` : ""}
                            </p>
                            {active.description && (
                              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600">{active.description}</p>
                            )}
                          </div>
                          {active.meeting_url && (
                            <a
                              href={active.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
                            >
                              Join live ↗
                            </a>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* Assignments */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">Assignments</h2>
              <div className="mt-3 space-y-3">
                {(assignments.data ?? []).map((a) => (
                  <div key={a.id} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-800">{a.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {a.instructions}
                          {a.due_at ? ` · Due ${new Date(a.due_at).toLocaleDateString()}` : ""}
                          {a.max_score ? ` · Max ${a.max_score} pts` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste your answer / link to your work…"
                        className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                        value={submitText[a.id] ?? ""}
                        onChange={(e) => setSubmitText((m) => ({ ...m, [a.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        disabled={!submitText[a.id]?.trim() || submit.isPending}
                        onClick={() => submit.mutate({ assignmentId: a.id, content: submitText[a.id] })}
                        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                      >
                        Submit
                      </button>
                    </div>
                  </div>
                ))}
                {(assignments.data ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-ink-500">No assignments yet.</p>
                )}
              </div>
            </section>

            {/* Quizzes */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">Quizzes & assessments</h2>
              <div className="mt-3 space-y-3">
                {(quizzes.data ?? []).map((q) => (
                  <div key={q.id} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-800">{q.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          <span className="rounded-full bg-brand-blue-light px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                            {subjectName(subjectMap, q.subject_id)}
                          </span>{" "}
                          {q.instructions ?? "Auto-graded quiz"}
                          {q.due_at ? ` · Due ${new Date(q.due_at).toLocaleDateString()}` : ""} · Pass {q.pass_threshold}%
                        </p>
                      </div>
                      {quiz.phase === "done" && quiz.result ? (
                        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", quiz.result.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600")}>
                          {quiz.result.score}/{quiz.result.max_score} · {quiz.result.passed ? "Passed" : "Retry"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={startQuiz.isPending}
                          onClick={() => {
                            setQuiz({ phase: "starting" });
                            startQuiz.mutate(q.id);
                          }}
                          className="rounded-lg bg-brand-navy px-4 py-2 text-xs font-bold text-white hover:bg-brand-navy/90 disabled:opacity-40"
                        >
                          {quiz.phase === "starting" ? "Starting…" : "Start quiz"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(quizzes.data ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-ink-500">No quizzes yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Resources */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">Resources</h2>
              <div className="mt-3 space-y-2">
                {(resources.data ?? []).map((r) => (
                  <a
                    key={r.id}
                    href={r.file_url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-ink-100 px-4 py-3 text-sm hover:border-brand-gold"
                  >
                    <span>📄</span>
                    <span className="flex-1">
                      <span className="block font-semibold text-ink-800">{r.title}</span>
                      {r.description && <span className="block text-xs text-ink-500">{r.description}</span>}
                    </span>
                  </a>
                ))}
                {(resources.data ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-ink-500">No resources yet.</p>
                )}
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">Lesson notes</h2>
              <div className="mt-3 space-y-2">
                {(notes.data ?? []).map((n) => (
                  <div key={n.id} className="rounded-xl bg-[#F8EBCF] px-4 py-3 text-sm">
                    <p className="text-ink-700">{n.content}</p>
                    {n.homework && <p className="mt-1 text-xs font-semibold text-brand-gold-dark">Homework: {n.homework}</p>}
                    <p className="mt-1 text-[11px] text-ink-500">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {(notes.data ?? []).length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-500">No notes yet.</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a note…"
                  className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!noteText.trim() || addNote.isPending}
                  onClick={() => addNote.mutate((lessons.data ?? [])[0]?.id ?? "")}
                  className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </section>

            {/* Progress reports */}
            <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">Progress</h2>
              <div className="mt-3 space-y-3">
                {(reports.data ?? []).map((r) => (
                  <div key={r.id} className="rounded-xl border border-ink-100 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-500">
                        {new Date(r.period_start).toLocaleDateString()} - {new Date(r.period_end).toLocaleDateString()}
                      </span>
                      <span className="rounded-full bg-brand-gold-light px-2 py-0.5 text-xs font-bold text-brand-navy">★ {r.overall_rating}/5</span>
                    </div>
                    {r.strengths && <p className="mt-2 text-ink-700">💪 {r.strengths}</p>}
                    {r.weaknesses && <p className="mt-1 text-ink-600">⚠️ {r.weaknesses}</p>}
                    {r.recommendations && <p className="mt-1 text-ink-700">🎯 {r.recommendations}</p>}
                  </div>
                ))}
                {(reports.data ?? []).length === 0 && (
                  <p className="py-4 text-center text-sm text-ink-500">No reports yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Quiz modal */}
      {quiz.phase === "taking" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-brand-navy">{quiz.data.title}</h3>
              <button
                type="button"
                onClick={() => setQuiz({ phase: "idle" })}
                className="grid size-8 place-items-center rounded-full bg-ink-100 text-ink-500 hover:bg-ink-200"
                aria-label="Close quiz"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-ink-500">Pass mark: {quiz.data.pass_threshold}% · Answer all questions, then submit.</p>
            <div className="mt-4 space-y-5">
              {quiz.data.questions.map((q, qi) => (
                <div key={q.id} className="rounded-xl border border-ink-100 p-4">
                  <p className="text-sm font-semibold text-ink-800">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() =>
                          setQuiz((s) => (s.phase === "taking" ? { ...s, answers: { ...s.answers, [q.id]: oi } } : s))
                        }
                        className={cn(
                          "rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
                          quiz.answers[q.id] === oi
                            ? "border-brand-gold bg-brand-gold-light text-brand-navy"
                            : "border-ink-200 text-ink-600 hover:border-ink-300"
                        )}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={gradeQuiz.isPending || Object.keys(quiz.answers).length < quiz.data.questions.length}
              onClick={() => gradeQuiz.mutate({ id: quiz.data.attempt.assessment_id, answers: quiz.answers })}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
            >
              {gradeQuiz.isPending ? "Grading…" : `Submit quiz (${Object.keys(quiz.answers).length}/${quiz.data.questions.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Quiz result */}
      {quiz.phase === "done" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="grid size-16 place-items-center rounded-2xl bg-brand-gold-light text-brand-green">{quiz.result.passed ? <PartyPopper size={32} /> : <BookOpen size={32} />}</div>
            <h3 className="mt-3 font-display text-xl font-bold text-brand-navy">
              {quiz.result.passed ? "Quiz passed!" : "Keep practicing"}
            </h3>
            <p className="mt-2 text-sm text-ink-500">
              You scored <span className="font-extrabold text-brand-navy">{quiz.result.score}/{quiz.result.max_score}</span>{" "}
              ({quiz.result.correct}/{quiz.result.total} correct)
              {quiz.result.passed ? "" : " - you can retake it anytime."}
            </p>
            <button
              type="button"
              onClick={() => setQuiz({ phase: "idle" })}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
