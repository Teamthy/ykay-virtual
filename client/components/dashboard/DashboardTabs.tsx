"use client";

import { cn } from "@/lib/utils";

// DashboardTabs — the shared horizontal tab nav for dashboard surfaces.
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
                ? "bg-brand-gold text-ink-900"
                : "border border-ink-200 bg-white text-ink-600 hover:border-brand-gold hover:text-ink-900"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  isActive ? "bg-black/10 text-ink-900" : "bg-brand-gold-light text-brand-gold-dark"
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
