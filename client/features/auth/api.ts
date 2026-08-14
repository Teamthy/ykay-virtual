import { apiFetch } from "@/lib/api";

// Auth API — session-cookie based (httpOnly `nuvora_session` cookie).
// The cookie is set/cleared by the server; the client never touches the raw
// token. `credentials: "include"` is set by apiFetch so cookies flow on
// same-origin and cross-origin (dev) requests.

export type CurrentUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  status: string;
  timezone: string;
  roles: string[];
  onboarded: boolean;
  created_at: string;
};

export async function markOnboarded(): Promise<void> {
  await apiFetch("/auth/me/onboarded", { method: "POST" });
}

export type RegisterInput = {
  email: string;
  password: string;
  roles: string[];
  referral_code?: string;
};

export async function register(input: RegisterInput): Promise<CurrentUser> {
  const res = await apiFetch<CurrentUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await apiFetch<CurrentUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

/** Returns the current user from the session cookie, or null when signed out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const res = await apiFetch<CurrentUser>("/auth/me", { cache: "no-store" });
    return res.data;
  } catch {
    return null;
  }
}

export function isAdmin(user: CurrentUser | null): boolean {
  return !!user?.roles?.some((r) => r === "SUPER_ADMIN" || r === "ACADEMIC_ADMIN");
}

export function isTutor(user: CurrentUser | null): boolean {
  return !!user?.roles?.includes("TUTOR");
}

// --- Email verification + password reset (Phase 8) ---

export async function resendVerificationEmail(email: string): Promise<void> {
  await apiFetch("/auth/verify-email/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmVerification(token: string): Promise<{ verified: boolean; status: string }> {
  const res = await apiFetch<{ verified: boolean; status: string }>("/auth/verify-email/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return res.data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  await apiFetch("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// --- Magic-link login (phase 18) ---

export async function requestLoginCode(email: string): Promise<void> {
  await apiFetch("/auth/login-code/request", { method: "POST", body: JSON.stringify({ email }) });
}

export async function confirmLoginCode(email: string, code: string): Promise<CurrentUser> {
  const res = await apiFetch<CurrentUser>("/auth/login-code/confirm", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  return res.data;
}

// --- Google OAuth (phase 29) ---

export async function getGoogleAuthURL(): Promise<{ url: string; state: string }> {
  const res = await apiFetch<{ url: string; state: string }>("/auth/google/url");
  return res.data;
}

// --- Onboarding helpers (phase 30) ---

export async function setPrimaryRole(role: string): Promise<string[]> {
  const res = await apiFetch<{ roles: string[] }>("/auth/me/role", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
  return res.data.roles;
}

export async function changePassword(newPassword: string): Promise<void> {
  await apiFetch("/auth/me/password", {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export type SessionLearner = {
  id: string;
  first_name: string;
  last_name: string;
  timezone: string;
};

export type SessionTutorProfile = { id: string; status: string };

// Authoritative role/profile mapping for authenticated UI surfaces. IDs in
// this response are derived server-side from the session and must replace all
// fixture UUIDs in dashboards, LMS and mobile clients.
export type SessionContext = {
  user_id: string;
  roles: string[];
  learners: SessionLearner[];
  student?: SessionLearner;
  tutor_profile?: SessionTutorProfile;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  try {
    const res = await apiFetch<SessionContext>("/auth/me/context", { cache: "no-store" });
    return res.data;
  } catch {
    return null;
  }
}
