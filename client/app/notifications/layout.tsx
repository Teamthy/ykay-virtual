"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
