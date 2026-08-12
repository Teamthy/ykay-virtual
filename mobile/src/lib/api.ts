import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

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
