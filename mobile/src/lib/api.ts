import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// NUVORA mobile API client — talks to the same /api/v1 backend as the web
// app. The web uses httpOnly session cookies; the native app uses a bearer
// token stored in the OS keychain (SecureStore).
//
// Environment resolution (launch-safe):
//   1. process.env.EXPO_PUBLIC_API_URL (injected at build time by EAS/Expo) —
//      the ONLY production path; set it in your EAS build profile.
//   2. localhost fallback for local dev.
// Never commit a production URL as a hard default — a build without
// EXPO_PUBLIC_API_URL targets localhost and fails fast, it never silently
// ships traffic at the wrong backend.

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:8080/api/v1";

const TOKEN_KEY = "nuvora_session_token";

const DEFAULT_TIMEOUT_MS = 20000;

export type Envelope<T> = { data: T; meta?: Record<string, unknown> };
export type ErrorEnvelope = { error: { code: string; message: string } };

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Signal that the stored session is invalid (401) so the app can route to
// login. Screens / auth hooks subscribe via onUnauthorized.
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(h: UnauthorizedHandler | null) {
  unauthorizedHandler = h;
}

function fireUnauthorized() {
  // Best-effort: clear the stale token and notify the app once.
  setToken(null).catch(() => {});
  if (unauthorizedHandler) unauthorizedHandler();
}

// fetch with a hard timeout (AbortController).
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

// Register this device for push (M4): fetch the Expo push token and POST it
// to the device registry. Best-effort — notifications are progressive.
export async function registerDevice(): Promise<void> {
  try {
    if (!Constants.isDevice) return; // push tokens are device-only
    // Expo Go (SDK 53+) removed remote push — skip entirely in preview mode.
    if (Constants.appOwnership === "expo") return;
    // Lazy import: in Expo Go the bare import alone logs a scary ERROR.
    const Notifications = await import("expo-notifications");
    const perms = await Notifications.requestPermissionsAsync();
    if (!perms.granted) return;
    const token = await Notifications.getExpoPushTokenAsync({ projectId: Constants.expoConfig?.extra?.projectId });
    await apiFetch("/me/devices", {
      method: "POST",
      body: JSON.stringify({
        token: token.data,
        platform: Platform.OS,
        app_version: Constants.expoConfig?.version ?? "0.1.0",
      }),
    });
  } catch {
    // Push registration must never block auth.
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  opts: { retries?: number } = {}
): Promise<Envelope<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client": "nuvora-mobile",
  };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const maxRetries = opts.retries ?? 1; // default: one retry for transient failures
  let lastErr: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...init, headers });
      if (res.status === 401) {
        // Only treat 401 as "your session died" when we actually attached a
        // token. Public screens sometimes call protected endpoints while
        // signed out (e.g. LMS before login) — that 401 must NOT clear a
        // session or bounce the user to /login.
        if (token) fireUnauthorized();
        const err = (await res.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(err?.error?.message || (token ? "Session expired. Please log in again." : "Authentication required"));
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(err?.error?.message || `Request failed ${res.status}`);
      }
      return (await res.json()) as Envelope<T>;
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      const retriable = isTimeout || (e instanceof Error && /network|fetch|failed to fetch/i.test(e.message));
      lastErr = e instanceof Error ? e : new Error(String(e));
      if (!retriable || attempt >= maxRetries) {
        if (isTimeout) throw new Error("Request timed out. Check your connection.");
        throw lastErr;
      }
      // small backoff before retry
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr ?? new Error("Request failed");
}

// --- On-demand video lesson progress (backend 000035) ---------------------
// A lesson can carry a pre-recorded `video_url`; the app records watch state
// via these endpoints so the web LMS and reports see the same progress.

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

export async function getLessonProgress(
  lessonId: string
): Promise<LessonProgress | null> {
  const res = await apiFetch<LessonProgress | { watched: boolean; position_seconds: number }>(
    `/learning/lessons/${lessonId}/progress`
  );
  return res.data as LessonProgress;
}

// learnerQuery — appends the parent's pinned learner to learner-scoped
// endpoints (backend ResolveStudent accepts ?student_profile_id=).
export function learnerQuery(studentProfileId?: string | null): string {
  return studentProfileId ? `?student_profile_id=${encodeURIComponent(studentProfileId)}` : "";
}

export async function getMyLessonProgress(studentProfileId?: string | null): Promise<LessonProgress[]> {
  const res = await apiFetch<LessonProgress[]>(`/me/learning/progress${learnerQuery(studentProfileId)}`);
  return res.data ?? [];
}

// --- Practice exams (CBT) --------------------------------------------------
// Tutor-authored papers with timed student attempts (backend 000059).
// Tutors create/list papers; students sit attempts and review marked papers.

export type PracticeExamSummary = {
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

export type PracticePaperQuestion = { id: string; position: number; text: string; options: string[] };

export type PracticePaper = {
  id: string;
  subject: string;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  question_count: number;
  questions: PracticePaperQuestion[];
};

export type PracticeAttemptItem = {
  attempt_id: string;
  exam_id: string;
  exam_title: string;
  exam_subject: string;
  score?: number | null;
  passed?: boolean | null;
  total: number;
  started_at: string;
  expires_at: string;
  submitted_at?: string | null;
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
  questions: {
    id: string;
    position: number;
    text: string;
    options: string[];
    chosen_index?: number | null;
    correct_index: number;
    explanation: string;
  }[];
};

export type PracticeExamInput = {
  subject: string;
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  questions: { text: string; options: string[]; correct_index: number; explanation?: string }[];
};

export async function listPracticeExams(): Promise<PracticeExamSummary[]> {
  const res = await apiFetch<PracticeExamSummary[]>("/learning/exams");
  return res.data ?? [];
}

export async function getPracticePaper(id: string): Promise<PracticePaper> {
  const res = await apiFetch<PracticePaper>(`/learning/exams/${id}`);
  return res.data;
}

export async function startPracticeAttempt(examId: string): Promise<{ attempt_id: string; started_at: string; expires_at: string }> {
  const res = await apiFetch<{ attempt_id: string; started_at: string; expires_at: string }>(
    `/learning/exams/${examId}/attempts`,
    { method: "POST" }
  );
  return res.data;
}

export async function submitPracticeAttempt(
  attemptId: string,
  answers: Record<string, number>
): Promise<{ attempt_id: string; score: number; passed: boolean; correct: number; total: number; expired: boolean; submitted_at: string }> {
  const res = await apiFetch<{
    attempt_id: string; score: number; passed: boolean; correct: number; total: number; expired: boolean; submitted_at: string;
  }>(`/learning/exams/attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  return res.data;
}

export async function listMyAttempts(): Promise<PracticeAttemptItem[]> {
  const res = await apiFetch<PracticeAttemptItem[]>("/learning/exams/attempts");
  return res.data ?? [];
}

export async function getAttemptReview(attemptId: string): Promise<AttemptReview> {
  const res = await apiFetch<AttemptReview>(`/learning/exams/attempts/${attemptId}`);
  return res.data;
}

export async function listTutorExams(): Promise<PracticeExamSummary[]> {
  const res = await apiFetch<PracticeExamSummary[]>("/tutor/exams");
  return res.data ?? [];
}

export async function createTutorExam(input: PracticeExamInput): Promise<PracticeExamSummary> {
  const res = await apiFetch<PracticeExamSummary>("/tutor/exams", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function getTutorExam(id: string): Promise<PracticeExamSummary> {
  const res = await apiFetch<PracticeExamSummary>(`/tutor/exams/${id}`);
  return res.data;
}

export async function deleteTutorExam(id: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/tutor/exams/${id}`, { method: "DELETE" });
}

export async function listExamAttempts(examId: string): Promise<PracticeAttemptItem[]> {
  const res = await apiFetch<PracticeAttemptItem[]>(`/tutor/exams/${examId}/attempts`);
  return res.data ?? [];
}

// --- Admin console (mobile read-only overview) ------------------------------
// /admin/overview aggregates the ops dashboard in one request; the full
// console stays desktop-first on the web. /admin/email/test lets a super
// admin verify email delivery from the mobile console.

export type AdminOverview = {
  stats: {
    users: number;
    active_users: number;
    tutors_total: number;
    tutors_approved: number;
    tutors_pending: number;
    orders_total: number;
    orders_paid: number;
    revenue_in_escrow: number;
    revenue_paid_out: number;
    lessons_this_week: number;
    lessons_today: number;
    cohorts_published: number;
    pending_enrolments: number;
    overdue_lesson_notes: number;
    pending_refunds: number;
  };
  leads_new: number;
  leads_total: number;
  payouts_pending_total: number;
  vetting_submitted: number;
  joins_pending: number;
  tickets_open: number;
  lessons_today: { id: string; title: string; start_at: string; meeting_url?: string | null }[];
  recent_audit: { id: string; action: string; target_type: string; created_at: string }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await apiFetch<AdminOverview>("/admin/overview");
  return res.data;
}

export async function sendAdminTestEmail(): Promise<{ sent: boolean; to: string; provider: string }> {
  const res = await apiFetch<{ sent: boolean; to: string; provider: string }>("/admin/email/test", { method: "POST" });
  return res.data;
}

// --- Google sign-in (mobile OAuth) -----------------------------------------
// The backend builds a consent URL whose redirect lands on the API's own
// callback-mobile page; that page posts the session token into the app's
// WebView. Requires the API callback registered in Google Console.

export async function getGoogleAuthURL(): Promise<string> {
  const res = await apiFetch<{ url: string; state: string }>("/auth/google/url?mobile=1");
  return res.data.url;
}

// --- Banks (tutor payout details) ------------------------------------------

export type Bank = { name: string; code: string };

export async function listBanks(): Promise<Bank[]> {
  const res = await apiFetch<Bank[]>("/tutors/banks");
  return res.data ?? [];
}

export async function resolveBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<string> {
  const res = await apiFetch<{ account_name: string }>("/tutors/banks/resolve", {
    method: "POST",
    body: JSON.stringify({ account_number: accountNumber, bank_code: bankCode }),
  });
  return res.data.account_name;
}
