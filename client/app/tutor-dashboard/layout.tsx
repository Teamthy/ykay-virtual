"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="tutor">{children}</AppShell>;
}
