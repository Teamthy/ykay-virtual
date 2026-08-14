import Link from "next/link";
import { cn } from "@/lib/utils";

// PageHero — inner-page hero on the PrebuiltUI grid template (Batch 3):
// grid-pattern background, breadcrumbs, optional eyebrow pill, oversized
// headline, subtitle, CTA row. No photo hotlinks; the grid is an inline
// SVG. (The HOMEPAGE keeps its own image slider — this template is for
// every other page, per the brand directive.)

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%23F4B400' stroke-opacity='0.08' stroke-width='1'/%3E%3C/svg%3E\")";

export type Crumb = { name: string; href?: string };

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  align?: "left" | "center";
  children?: React.ReactNode;
  className?: string;
};

export function PageHero({ title, subtitle, eyebrow, crumbs, align = "left", children, className }: PageHeroProps) {
  const centered = align === "center";
  return (
    <section
      className={cn("w-full bg-no-repeat bg-center", className)}
      style={{ backgroundImage: GRID_BG, backgroundColor: "#FFFCF5" }}
    >
      <div
        className={cn(
          "mx-auto max-w-[1400px] px-6 py-12 md:px-10 md:py-16",
          centered && "flex flex-col items-center text-center"
        )}
      >
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-ink-300">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-brand-gold-dark hover:underline underline-offset-2">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-700">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {eyebrow && (
          <p className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark shadow-sm">
            {eyebrow}
          </p>
        )}

        <h1 className={cn("mt-4 font-display text-4xl tracking-[0.02em] text-brand-navy md:text-5xl", centered && "mx-auto max-w-3xl")}>
          {title}
        </h1>

        {subtitle && (
          <p className={cn("mt-4 max-w-2xl leading-relaxed text-ink-600", centered && "mx-auto")}>{subtitle}</p>
        )}

        {children && (
          <div className={cn("mt-7 flex flex-wrap gap-3", centered && "justify-center")}>{children}</div>
        )}
      </div>
    </section>
  );
}
