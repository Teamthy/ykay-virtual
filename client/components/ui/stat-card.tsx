import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Stat card (24.1) - KPI tile: label, value, optional trend + icon.

export type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  trend?: { direction: "up" | "down" | "flat"; text: string; positive?: boolean };
  className?: string;
};

export function StatCard({ label, value, hint, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl border border-ink-100 bg-white p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-brand-navy tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
          {trend && (
            <p
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 text-xs font-semibold",
                trend.positive === false ? "text-red-600" : "text-brand-green"
              )}
            >
              <span aria-hidden="true">{trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}</span>
              {trend.text}
            </p>
          )}
        </div>
        {icon && <div className="shrink-0 text-brand-blue">{icon}</div>}
      </div>
    </div>
  );
}
