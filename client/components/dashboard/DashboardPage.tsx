import { cn } from "@/lib/utils";

/** Shared padding + max-width for every AppShell page. */
export function DashboardPage({
  children,
  className,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8", className)}>
      {(title || actions) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-2xl font-bold text-ink-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
