import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// NUVORA mobile API client — talks to the same /api/v1 backend as the web
// app. The web uses httpOnly session cookies; the native app uses a bearer
// token stored in the OS keychain (SecureStore). A token is issued by the
// mobile-auth endpoint (phase M4 of the plan: POST /auth/login/mobile) —
// until then, sessions flow via cookie for web previews or the dev bridge.

const API_BASE =
  Constants.expoConfig?.extra?.apiUrl ?? "http://localhost:8080/api/v1";

const TOKEN_KEY = "nuvora_session_token";

export type Envelope<T> = { data: T; meta?: Record<string, unknown> };
export type ErrorEnvelope = { error: { code: string; message: string } };

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  init: RequestInit = {}
): Promise<Envelope<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client": "nuvora-mobile",
  };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ErrorEnvelope | null;
    throw new Error(err?.error?.message || `Request failed ${res.status}`);
  }
  return (await res.json()) as Envelope<T>;
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
