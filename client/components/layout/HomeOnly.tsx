"use client";

import { usePathname } from "next/navigation";
import { isAppRoute } from "@/components/layout/ShellVisibility";

/** Public pages share the same dark/footer-card ending; app and auth flows
 * keep their dedicated chrome and never show marketing navigation. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAppRoute(pathname)) return null;
  return <>{children}</>;
}
