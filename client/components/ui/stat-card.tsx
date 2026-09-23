import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    <div className={cn("rounded-[20px] border border-black/10 bg-white p-5 shadow-[0_4px_24px_rgba(15,42,26,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,42,26,0.12)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0F2A1A]/50">{label}</p>
          <p className="mt-2 font-display text-[26px] leading-none tracking-[-0.02em] text-[#0F2A1A] tabular-nums">{value}</p>
          {hint && <p className="mt-2 text-[12px] leading-[1.4] text-[#0F2A1A]/60">{hint}</p>}
          {trend && (
            <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", trend.positive === false ? "bg-red-50 text-red-600" : "bg-[#D6FF57] text-[#0F2A1A]")}>
              <span aria-hidden="true">{trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"}</span>
              {trend.text}
            </p>
          )}
        </div>
        {icon && <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white shrink-0">{icon}</div>}
      </div>
    </div>
  );
}
