import { apiFetch } from "@/lib/api";

// CBT practice exams — the client surface of the Go practice-exam engine
// (tutor-authored papers, timed student sittings, server-side grading).
// The answer key NEVER ships to the student: the paper endpoint returns
// question text + options only, and grading happens on submit.

export type ExamSummary = {
  id: string;
  subject: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  cohort_id?: string;
  status: string;
  question_count: number;
  created_at: string;
};

export type PlayerQuestion = {
  id: string;
  position: number;
  text: string;
  options: string[];
};

export type ExamPaper = {
  id: string;
  subject: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  question_count: number;
  questions: PlayerQuestion[];
};

export type OpenAttempt = {
  attempt_id: string;
  started_at: string;
  expires_at: string;
};

export type AttemptResult = {
  attempt_id: string;
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  expired: boolean;
  submitted_at: string;
};

export type AttemptItem = {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  exam_subject: string;
  score: number | null;
  passed: boolean | null;
  total: number;
  started_at: string;
  expires_at: string;
  submitted_at?: string;
};

export type ReviewQuestion = {
  id: string;
  position: number;
  text: string;
  options: string[];
  chosen_index: number | null;
  correct_index: number;
  explanation: string;
};

export type AttemptReview = {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  exam_subject: string;
  passing_score: number;
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  expired: boolean;
  submitted_at: string;
  questions: ReviewQuestion[];
};

// ---- tutor (authoring) ------------------------------------------------------

export type TutorQuestion = {
  id: string;
  position: number;
  text: string;
  options: string[];
  correct_index?: number;
  explanation?: string;
};

export type TutorExam = ExamSummary & { questions?: TutorQuestion[] };

export type ExamQuestionInput = {
  text: string;
  options: string[];
  correct_index: number;
  explanation?: string;
};

export type ExamInput = {
  subject: string;
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  cohort_id?: string | null;
  premium?: boolean;
  questions: ExamQuestionInput[];
};

export type TutorAttemptItem = AttemptItem & { student_name?: string };

// ---- student ----------------------------------------------------------------

export async function listMyExams(): Promise<ExamSummary[]> {
  return (await apiFetch<ExamSummary[]>("/learning/exams")).data;
}

export async function getExamPaper(id: string): Promise<ExamPaper> {
  return (await apiFetch<ExamPaper>(`/learning/exams/${id}`)).data;
}

/** Idempotent: returns the open sitting if one exists (Start == Resume). */
export async function startAttempt(examId: string): Promise<OpenAttempt> {
  return (
    await apiFetch<OpenAttempt>(`/learning/exams/${examId}/attempts`, {
      method: "POST",
    })
  ).data;
}

export async function submitAttempt(
  attemptId: string,
  answers: Record<string, number>,
): Promise<AttemptResult> {
  return (
    await apiFetch<AttemptResult>(
      `/learning/exams/attempts/${attemptId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ answers }),
      },
    )
  ).data;
}

export async function listMyAttempts(): Promise<AttemptItem[]> {
  return (await apiFetch<AttemptItem[]>("/learning/exams/attempts")).data;
}

export async function getAttemptReview(
  attemptId: string,
): Promise<AttemptReview> {
  return (
    await apiFetch<AttemptReview>(`/learning/exams/attempts/${attemptId}`)
  ).data;
}

// ---- tutor ------------------------------------------------------------------

export async function listTutorExams(): Promise<TutorExam[]> {
  return (await apiFetch<TutorExam[]>("/tutor/exams")).data;
}

export async function getTutorExam(id: string): Promise<TutorExam> {
  return (await apiFetch<TutorExam>(`/tutor/exams/${id}`)).data;
}

export async function createExam(input: ExamInput): Promise<TutorExam> {
  return (
    await apiFetch<TutorExam>("/tutor/exams", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).data;
}

export async function updateExam(
  id: string,
  input: ExamInput,
): Promise<TutorExam> {
  return (
    await apiFetch<TutorExam>(`/tutor/exams/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    })
  ).data;
}

export async function deleteExam(id: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/tutor/exams/${id}`, {
    method: "DELETE",
  });
}

export async function listExamAttempts(
  examId: string,
): Promise<TutorAttemptItem[]> {
  return (await apiFetch<TutorAttemptItem[]>(`/tutor/exams/${examId}/attempts`))
    .data;
}
