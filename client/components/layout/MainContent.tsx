"use client";

import { usePathname } from "next/navigation";
import { isAppRoute } from "@/components/layout/ShellVisibility";
import { cn } from "@/lib/utils";

/** Reserve room for the public mobile nav, not for auth or dashboard pages. */
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      id="main-content"
      tabIndex={-1}
      className={cn(
        "min-w-0 max-w-[100vw] overflow-x-clip outline-none",
        !isAppRoute(pathname) && "pb-16 lg:pb-0",
      )}
    >
      {children}
    </div>
  );
}
