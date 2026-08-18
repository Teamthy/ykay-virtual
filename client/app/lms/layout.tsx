"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default function LmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tutor = pathname.startsWith("/lms/tutor");
  return <AppShell variant={tutor ? "tutor" : undefined}>{children}</AppShell>;
}
