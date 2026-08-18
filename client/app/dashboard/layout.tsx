"use client";

import { AppShell } from "@/components/layout/AppShell";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell variant="parent">{children}</AppShell>;
}
