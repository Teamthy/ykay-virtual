import { apiFetch } from "@/lib/api";

// Auth API — session-cookie based (httpOnly `ykay_session` cookie).
// The cookie is set/cleared by the server; the client never touches the raw
// token. `credentials: "include"` is set by apiFetch so cookies flow on
// same-origin and cross-origin (dev) requests.

export type CurrentUser = {
  id: string;
  email: string;
  status: string;
  timezone: string;
  roles: string[];
  created_at: string;
};

export type RegisterInput = {
  email: string;
  password: string;
  roles: string[];
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
