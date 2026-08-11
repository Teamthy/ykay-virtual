import { cn } from "@/lib/utils";

// Progress indicator (24.1) — labelled bar with value text (text + colour,
// never colour alone).

export type ProgressProps = {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
  barClassName?: string;
};

export function Progress({ value, label, showValue = true, size = "md", className, barClassName }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
          {label && <span className="font-semibold text-ink-600">{label}</span>}
          {showValue && <span className="font-bold text-brand-navy tabular-nums">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn("w-full overflow-hidden rounded-full bg-ink-100", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-brand-navy to-brand-blue transition-all duration-500",
            barClassName
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
