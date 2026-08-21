import { apiFetch } from "@/lib/api";
import {
  getCohortAssignments,
  getCohortResources,
  type CohortAssignment,
  type CohortLesson,
  type CohortResource,
} from "@/features/cohorts/api/lessons";
import { type Cohort } from "@/features/cohorts/api/get";
import {
  getAttendanceSummary,
  listMyAssignments,
  listMySubmissions,
  submitAssignment,
  type Assignment,
  type AttendanceSummary,
  type Submission,
} from "@/features/portal/api";
import {
  listAssessments,
  startAssessment,
  submitAssessment,
  listSubmissions,
  gradeSubmission,
  listProgressReports,
  createProgressReport,
  type LearnerAssessment,
  type AssessmentStart,
  type AssessmentResult,
  type GradedSubmission,
  type ProgressReport,
  type ReportInput,
} from "@/features/learning/api";

// ── LMS API (phase 32) - student + tutor portals over the learning surface ──
// G1 (phase 43): profile IDs are session-resolved server-side; the optional
// parameters below exist only for admin views acting on an explicit profile.

export type LessonNote = {
  id: string;
  lesson_id: string;
  student_profile_id?: string;
  content: string;
  homework?: string;
  is_visible_to_parent?: boolean;
  created_at: string;
};

// --- On-demand video lesson progress (000035) ---

export type LessonProgress = {
  id?: string;
  lesson_id: string;
  student_profile_id?: string;
  watched: boolean;
  position_seconds: number;
  watched_at?: string | null;
  updated_at?: string;
};

export async function recordLessonProgress(
  lessonId: string,
  input: { watched: boolean; position_seconds: number }
): Promise<LessonProgress> {
  const res = await apiFetch<LessonProgress>(`/learning/lessons/${lessonId}/progress`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
  const res = await apiFetch<LessonProgress | { watched: boolean; position_seconds: number }>(
    `/learning/lessons/${lessonId}/progress`
  );
  return res.data as LessonProgress;
}

export async function getMyLessonProgress(): Promise<LessonProgress[]> {
  const res = await apiFetch<LessonProgress[]>("/me/learning/progress");
  return res.data ?? [];
}

export type AttendanceRow = {
  id?: string;
  lesson_id?: string;
  student_profile_id: string;
  status: string;
  note?: string;
  marked_at?: string;
};

export async function getCohort(id: string): Promise<Cohort> {
  const res = await apiFetch<Cohort>(`/cohorts/${id}`);
  return res.data;
}

export async function getCohortLessons(cohortId: string): Promise<CohortLesson[]> {
  const res = await apiFetch<CohortLesson[]>(`/cohorts/${cohortId}/lessons`);
  return res.data ?? [];
}

export async function getMyLessons(studentProfileId?: string): Promise<CohortLesson[]> {
  const q = studentProfileId ? `?student_profile_id=${studentProfileId}` : "";
  const res = await apiFetch<CohortLesson[]>(`/me/lessons${q}`);
  return res.data ?? [];
}

export async function getMyTutorLessons(tutorProfileId?: string): Promise<CohortLesson[]> {
  const q = tutorProfileId ? `?tutor_profile_id=${tutorProfileId}` : "";
  const res = await apiFetch<CohortLesson[]>(`/me/tutor-lessons${q}`);
  return res.data ?? [];
}

// --- Notes ---

export async function getLessonNotes(lessonId: string): Promise<LessonNote[]> {
  const res = await apiFetch<LessonNote[]>(`/lessons/${lessonId}/notes`);
  return res.data ?? [];
}

export async function addLessonNote(
  lessonId: string,
  input: { student_profile_id?: string; content: string; homework?: string; is_visible_to_parent?: boolean }
): Promise<LessonNote> {
  const res = await apiFetch<LessonNote>(`/lessons/${lessonId}/notes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

// --- Attendance ---

export async function getLessonAttendance(lessonId: string): Promise<AttendanceRow[]> {
  const res = await apiFetch<AttendanceRow[]>(`/lessons/${lessonId}/attendance`);
  return res.data ?? [];
}

export async function markAttendance(
  lessonId: string,
  input: { student_profile_id: string; status: string; note?: string }
): Promise<void> {
  await apiFetch(`/lessons/${lessonId}/attendance`, { method: "POST", body: JSON.stringify(input) });
}

export { getAttendanceSummary };

export async function getCohortAttendanceSummary(cohortId: string, studentProfileId: string): Promise<AttendanceSummary> {
  const lessons = await getCohortLessons(cohortId);
  const rows: AttendanceRow[] = [];
  for (const lesson of lessons.slice(0, 6)) {
    rows.push(...(await getLessonAttendance(lesson.id)));
  }
  const mine = rows.filter((r) => r.student_profile_id === studentProfileId);
  const present = mine.filter((r) => r.status === "PRESENT").length;
  const late = mine.filter((r) => r.status === "LATE").length;
  const absent = mine.filter((r) => r.status === "ABSENT").length;
  const total = mine.length;
  return {
    total,
    present,
    absent,
    late,
    excused: 0,
    untracked: Math.max(lessons.length - total, 0),
    rate: total ? Math.round(((present + late) / total) * 100) : 0,
  };
}

export {
  getCohortAssignments,
  getCohortResources,
  listMyAssignments,
  listMySubmissions,
  submitAssignment,
  listAssessments,
  startAssessment,
  submitAssessment,
  listSubmissions,
  gradeSubmission,
  listProgressReports,
  createProgressReport,
};
export type {
  CohortAssignment,
  CohortLesson,
  CohortResource,
  Cohort,
  Assignment,
  AttendanceSummary,
  Submission,
  LearnerAssessment,
  AssessmentStart,
  AssessmentResult,
  GradedSubmission,
  ProgressReport,
  ReportInput,
};

// --- Tutor authoring (LMS beyond MVP) ---

export type RosterEntry = {
  student_profile_id: string;
  name: string;
  status: string;
  enrolled_at: string;
};

export async function createCohortAssignment(
  cohortId: string,
  input: { title: string; instructions?: string; due_at?: string; max_score?: number }
): Promise<CohortAssignment> {
  const res = await apiFetch<CohortAssignment>(`/cohorts/${cohortId}/assignments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function createCohortResource(
  cohortId: string,
  input: { title: string; description?: string; file_url?: string }
): Promise<CohortResource> {
  const res = await apiFetch<CohortResource>(`/cohorts/${cohortId}/resources`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

// Upload a material file (PDF/Office/image/video) → public object URL, which
// the tutor then attaches to a cohort resource. Raw body; Content-Type is the
// file's MIME (apiFetch lets init.headers override its JSON default).
export async function uploadResourceFile(file: File): Promise<{ url: string }> {
  const res = await apiFetch<{ url: string }>("/me/uploads", {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  return res.data;
}

export async function getCohortEnrollments(cohortId: string): Promise<RosterEntry[]> {
  const res = await apiFetch<RosterEntry[]>(`/cohorts/${cohortId}/enrollments`);
  return res.data ?? [];
}

export type QuizQuestionInput = { question: string; options: string[]; correct_index: number };
export type QuizInput = {
  tutor_profile_id?: string;
  cohort_id: string;
  subject_id?: string;
  title: string;
  instructions?: string;
  pass_threshold: number;
  due_at?: string;
  questions: QuizQuestionInput[];
};

export async function createAssessment(input: QuizInput): Promise<LearnerAssessment> {
  const res = await apiFetch<LearnerAssessment>("/learning/assessments", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

// --- Tutor earnings (P1) ---

export type EscrowHold = {
  id: string;
  order_id: string;
  tutor_profile_id: string;
  amount: number;
  status: string;
  held_at: string;
  release_at?: string;
  released_at?: string;
  dispute_reason?: string;
};

export type Payout = {
  id: string;
  tutor_profile_id: string;
  escrow_hold_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at?: string;
};

export type TutorEarnings = {
  escrow_holds: EscrowHold[];
  payouts: Payout[];
  held_total: number;
  released_total: number;
  paid_total: number;
};

export async function getTutorEarnings(tutorProfileId?: string): Promise<TutorEarnings> {
  const q = tutorProfileId ? `?tutor_profile_id=${tutorProfileId}` : "";
  const res = await apiFetch<TutorEarnings>(`/me/earnings${q}`);
  return res.data;
}
