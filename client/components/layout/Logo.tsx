import { cn } from "@/lib/utils";

// NUVORA brand - text-only wordmark for now (mark comes with the final
// design). Anton display, tracked uppercase, navy on light / white on dark.

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      className={cn(
        "font-display text-[1.5rem] uppercase leading-none tracking-[0.02em]",
        dark ? "text-white" : "text-brand-navy",
        className
      )}
    >
      NUVORA
    </span>
  );
}
