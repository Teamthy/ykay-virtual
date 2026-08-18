"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="student">{children}</AppShell>;
}
