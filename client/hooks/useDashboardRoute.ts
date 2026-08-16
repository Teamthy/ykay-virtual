"use client";

// Role → dashboard routing (single source of truth). Every dashboard page
// and the post-login flow resolve the session user's home from here, so a
// student can never land on the parent dashboard (and vice versa).

// YK-008: INSTITUTION_ADMIN is scoped to its own institution and must NOT be
// treated as a platform admin (which would route it to the global /admin
// console and grant platform-wide UI). Only SUPER_ADMIN and ACADEMIC_ADMIN are
// platform admins.
export const ADMIN_ROLES = ["SUPER_ADMIN", "ACADEMIC_ADMIN"];

export function isAdmin(roles: string[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function homeForRoles(roles: string[]): string {
  if (isAdmin(roles)) return "/admin";
  if (roles.includes("TUTOR")) return "/tutor-dashboard";
  if (roles.includes("STUDENT")) return "/student-dashboard";
  if (roles.includes("PARENT")) return "/dashboard";
  return "/dashboard"; // safest fallback; the page will 401 if unauthenticated
}

export function onboardingPath(roles: string[]): string {
  return "/onboarding/wizard";
}

// Role sets each dashboard accepts (admins may view any).
export const DASHBOARD_ROLES: Record<string, string[]> = {
  "/dashboard": ["PARENT"],
  "/student-dashboard": ["STUDENT"],
  "/tutor-dashboard": ["TUTOR"],
  "/admin": ADMIN_ROLES,
  "/lms": ["PARENT", "STUDENT", "TUTOR"],
};
