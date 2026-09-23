"use client";

import { cn } from "@/lib/utils";

// DashboardTabs - the shared horizontal tab nav for dashboard surfaces.
// Pills with optional counts, brand gold active state.

export type TabDef = { key: string; label: string; count?: number };

export function DashboardTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dashboard sections">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
              isActive
                ? "bg-[#D6FF57] text-[#0F2A1A]"
                : "border border-black/10 bg-white text-[#0F2A1A]/70 hover:border-[#D6FF57] hover:text-[#0F2A1A]"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive ? "bg-black/10 text-[#0F2A1A]" : "bg-[#F9F6ED] text-[#0F2A1A]"
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
