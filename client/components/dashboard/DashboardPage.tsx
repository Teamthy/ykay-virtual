import { cn } from "@/lib/utils";

/** Shared padding + max-width for every AppShell page. */
export function DashboardPage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8", className)}>
      {children}
    </div>
  );
}
