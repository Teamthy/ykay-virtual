"use client";

import { RoleAwareShell } from "@/components/layout/AppShell";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <RoleAwareShell>{children}</RoleAwareShell>;
}
