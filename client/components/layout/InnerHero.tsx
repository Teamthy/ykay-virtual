import { cn } from "@/lib/utils";

// InnerHero — the same brand treatment as PageHero, applied as a wrapper
// around a page's own header content (detail pages with tags/stats/CTAs).
// Self-contained inline SVG grid, brand palette.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%2370F250' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

export function InnerHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("w-full border-b border-ink-100 bg-surface bg-no-repeat bg-cover bg-center", className)}
      style={{ backgroundImage: GRID_BG }}
    >
      <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
        {children}
      </div>
    </section>
  );
}
