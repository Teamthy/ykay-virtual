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

// ---- practice bank (shared 2,000+ question bank, random paper per draw) ----

export type BankSubject = {
  slug: string;
  name: string;
  class_level: string;
  department: string;
  question_count: number;
};

export type BankQuestion = {
  id: string;
  topic: string;
  difficulty: number;
  text: string;
  options: string[];
};

export type BankPaper = {
  subject: string;
  limit: number;
  count: number;
  questions: BankQuestion[];
};

export type BankGradedQuestion = {
  id: string;
  text: string;
  options: string[];
  selected_index: number | null;
  correct_index: number;
  explanation: string;
  correct: boolean;
};

export type BankGradeResult = {
  score: number;
  correct: number;
  total: number;
  review: BankGradedQuestion[];
};

/** Subjects with live published counts. */
export async function listBankSubjects(): Promise<BankSubject[]> {
  return (await apiFetch<BankSubject[]>("/cbt/subjects")).data;
}

/**
 * Draw a random paper — every call is a fresh subset, so two students (or
 * two sittings) never see the same paper. Pass a nonce to bust react-query.
 */
export async function drawBankPaper(
  slug: string,
  limit: number,
): Promise<BankPaper> {
  return (
    await apiFetch<BankPaper>(`/cbt/subjects/${slug}/paper?limit=${limit}`)
  ).data;
}

/** Server-side grading — the key never ships with the paper. */
export async function gradeBankPaper(
  answers: { question_id: string; selected_index: number | null }[],
): Promise<BankGradeResult> {
  return (
    await apiFetch<BankGradeResult>("/cbt/grade", {
      method: "POST",
      body: JSON.stringify({ answers }),
    })
  ).data;
}

// ---- admin: bank console ----------------------------------------------------

export type AdminBankQuestion = {
  id: string;
  subject_slug: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source: string;
  status: string;
};

export type AdminBankPage = {
  data: AdminBankQuestion[];
  meta: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
};

export async function adminListBankQuestions(
  subject: string,
  page: number,
  pageSize: number,
): Promise<AdminBankPage> {
  const res = await apiFetch<AdminBankQuestion[]>(
    `/admin/cbt/questions?subject=${encodeURIComponent(subject)}&page=${page}&page_size=${pageSize}`,
  );
  if (!res.meta) throw new Error("Missing pagination meta");
  return { data: res.data, meta: res.meta };
}

export async function adminSetBankQuestionStatus(
  id: string,
  status: "draft" | "published",
): Promise<void> {
  await apiFetch(`/admin/cbt/questions/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function adminDeleteBankQuestion(id: string): Promise<void> {
  await apiFetch(`/admin/cbt/questions/${id}`, { method: "DELETE" });
}

export type NewBankQuestion = {
  subject_slug: string;
  subject_name?: string;
  class_level?: string;
  department?: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: string[];
  correct_index: number;
  explanation?: string;
  source?: string;
};

export async function adminCreateBankQuestion(
  input: NewBankQuestion,
): Promise<void> {
  await apiFetch("/admin/cbt/questions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** CSV import — duplicate stems are skipped, so re-importing is idempotent. */
export async function adminImportBankCSV(
  file: File,
): Promise<{ imported: number; skipped: number }> {
  const body = new FormData();
  body.append("file", file);
  return (
    await apiFetch<{ imported: number; skipped: number }>("/admin/cbt/import", {
      method: "POST",
      body,
    })
  ).data;
}
