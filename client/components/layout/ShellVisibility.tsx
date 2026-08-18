"use client";

import { usePathname } from "next/navigation";

// ShellVisibility â€” keeps marketing chrome (header/footer/mobile nav/chat)
// OFF authenticated surfaces. Dashboards render their own personalized
// DashboardShell instead; this removes the "why is the homepage navbar on
// my dashboard?" problem structurally, not visually.

const APP_PREFIXES = [
  "/dashboard",
  "/student-dashboard",
  "/tutor-dashboard",
  "/lms",
  "/admin",
  "/messages",
  "/notifications",
  "/checkout",
  "/account",
  "/saved",
  "/chat",
  "/offline",
  "/onboarding",
];

export function isAppRoute(pathname: string): boolean {
  return APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function ShellVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAppRoute(pathname)) return null;
  return <>{children}</>;
}
