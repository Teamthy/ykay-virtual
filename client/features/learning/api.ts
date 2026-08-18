import { apiFetch } from "@/lib/api";

// Learning, Assessment & Reporting - phase 11c API client (working-doc §13).

export type AssessmentQuestionView = {
  id: string;
  question: string;
  options: string[];
};

export type LearnerAssessment = {
  id: string;
  cohort_id?: string;
  lesson_id?: string;
  tutor_profile_id: string;
  title: string;
  instructions?: string;
  pass_threshold: number;
  due_at?: string;
  status: string;
  created_at: string;
};

export type Attempt = {
  id: string;
  assessment_id: string;
  student_profile_id: string;
  status: string;
  started_at: string;
  expires_at: string;
};

export type AssessmentStart = {
  title: string;
  attempt: Attempt;
  questions: AssessmentQuestionView[];
  pass_threshold: number;
};

export type AssessmentResult = {
  attempt_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  correct: number;
  total: number;
};

export type GradedSubmission = {
  id: string;
  assignment_id: string;
  student_profile_id: string;
  content?: string;
  submitted_at: string;
  score?: number;
  feedback?: string;
  graded_at?: string;
};

export type ProgressReport = {
  id: string;
  student_profile_id: string;
  tutor_profile_id: string;
  period_start: string;
  period_end: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  overall_rating: number;
  created_at: string;
};

export type Analytics = {
  funnel: {
    registered_users: number;
    learners_created: number;
    orders_created: number;
    paid_orders: number;
    enrollments_confirmed: number;
    conversion_rate: number;
  };
  cohorts: {
    cohort_id: string;
    title: string;
    capacity: number;
    enrolled: number;
    fill_rate: number;
    lessons_count: number;
    attendance_rate: number;
  }[];
  revenue: {
    programme_id: string;
    programme_title: string;
    revenue: number;
    orders: number;
  }[];
};

// --- Assessments (student) ---

export async function listAssessments(cohortId?: string) {
  const res = await apiFetch<LearnerAssessment[]>(
    `/learning/assessments${cohortId ? `?cohort_id=${cohortId}` : ""}`
  );
  return res.data ?? [];
}

export async function startAssessment(assessmentId: string, studentProfileId?: string) {
  const q = studentProfileId ? `?student_profile_id=${studentProfileId}` : "";
  const res = await apiFetch<AssessmentStart>(
    `/learning/assessments/${assessmentId}/start${q}`,
    { method: "POST" }
  );
  return res.data;
}

export type AnswerPayload = { question_id: string; chosen_index: number };

export async function submitAssessment(assessmentId: string, studentProfileId: string | undefined, answers: AnswerPayload[]) {
  const q = studentProfileId ? `?student_profile_id=${studentProfileId}` : "";
  const res = await apiFetch<AssessmentResult>(
    `/learning/assessments/${assessmentId}/submit${q}`,
    { method: "POST", body: JSON.stringify({ answers }) }
  );
  return res.data;
}

// --- Grading (tutor) ---

export async function listSubmissions(assignmentId: string) {
  const res = await apiFetch<GradedSubmission[]>(`/learning/assignments/${assignmentId}/submissions`);
  return res.data ?? [];
}

export async function gradeSubmission(submissionId: string, score: number, feedback?: string) {
  const res = await apiFetch<GradedSubmission>(`/learning/submissions/${submissionId}/grade`, {
    method: "POST",
    body: JSON.stringify({ score, feedback }),
  });
  return res.data;
}

// --- Progress reports (tutor writes, student/parent reads) ---

export type ReportInput = {
  student_profile_id: string;
  tutor_profile_id?: string;
  period_start: string;
  period_end: string;
  strengths?: string;
  weaknesses?: string;
  recommendations?: string;
  overall_rating: number;
};

export async function createProgressReport(input: ReportInput) {
  const res = await apiFetch<ProgressReport>("/learning/progress-reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function listProgressReports(studentProfileId?: string, tutorProfileId?: string) {
  const q = tutorProfileId
    ? `?tutor_profile_id=${tutorProfileId}`
    : studentProfileId
      ? `?student_profile_id=${studentProfileId}`
      : "";
  const res = await apiFetch<ProgressReport[]>(`/learning/progress-reports${q}`);
  return res.data ?? [];
}

// --- Analytics (admin) ---

export async function getAnalytics() {
  const res = await apiFetch<Analytics>("/admin/analytics");
  return res.data;
}
