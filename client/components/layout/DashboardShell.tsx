"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

// Back-compat: pages that still wrap with DashboardShell get the role-aware
// chrome. Prefer a route layout (dashboard/student/tutor/admin/lms).

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
