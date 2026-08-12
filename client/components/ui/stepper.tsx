import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Stepper (24.1) — progress steps for long applications/forms.
// Each step: numbered node + label; completed steps get a check.

export type StepperProps = {
  steps: string[];
  current: number; // 0-based index of the active step
  className?: string;
};

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol className={cn("flex items-center gap-2 overflow-x-auto", className)} aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-brand-green text-white",
                  active && "bg-brand-gold text-ink-900 ring-4 ring-brand-gold-light",
                  !done && !active && "bg-ink-100 text-ink-500"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check size={14} /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-xs font-semibold",
                  active ? "text-brand-navy" : done ? "text-ink-600" : "text-ink-400"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className={cn("h-px flex-1 min-w-4", done ? "bg-brand-green" : "bg-ink-200")} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
