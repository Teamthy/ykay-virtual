import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
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
        // Invalid/expired session — clear it and notify the app.
        fireUnauthorized();
        const err = (await res.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(err?.error?.message || "Session expired. Please log in again.");
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

export async function getMyLessonProgress(): Promise<LessonProgress[]> {
  const res = await apiFetch<LessonProgress[]>("/me/learning/progress");
  return res.data ?? [];
}
