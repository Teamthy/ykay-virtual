"use client";

import { usePathname } from "next/navigation";

// HomeOnly - renders its children ONLY on the marketing home page (/).
// Used to keep the global footer on the landing page only, so marketing
// subpages and (via ShellVisibility) dashboards never show a homepage footer.

export function HomeOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return <>{children}</>;
}
