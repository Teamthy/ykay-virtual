import { cn } from "@/lib/utils";

// NUVORA brand mark — navy/blue monogram tile with a restrained gold dot.
// Used in the header (light) and footer (dark) per the brand spec: modern,
// calm, premium, academic.

export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-navy via-brand-blue to-brand-blue text-white shadow-soft">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {/* open book */}
          <path d="M12 6c-1.8-1.4-4.4-2-7-2v14c2.6 0 5.2.6 7 2 1.8-1.4 4.4-2 7-2V4c-2.6 0-5.2.6-7 2z" />
          <path d="M12 6v14" />
        </svg>
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-brand-gold ring-2 ring-white" />
      </span>
      <span
        className={cn(
          "font-display text-[1.45rem] uppercase leading-none tracking-[0.02em]",
          dark ? "text-white" : "text-brand-navy"
        )}
      >
        NUVORA
      </span>
    </span>
  );
}
