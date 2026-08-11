import Link from "next/link";
import { cn } from "@/lib/utils";

// PageHero — NUVORA marketing page header: full-width navy gradient band with
// decorative glows, breadcrumbs, eyebrow, title, subtitle and CTA row.

export type Crumb = { name: string; href?: string };

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  align?: "left" | "center";
  children?: React.ReactNode; // CTA row
  className?: string;
};

export function PageHero({ title, subtitle, eyebrow, crumbs, align = "center", children, className }: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-brand-navy-dark via-brand-navy to-brand-blue text-white",
        className
      )}
    >
      {/* decorative glows */}
      <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-brand-blue/30 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-36 -left-20 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl" aria-hidden="true" />

      <div className={cn("container-x relative py-14 md:py-16", align === "center" && "text-center")}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className={cn("mb-5 text-xs text-white/55", align === "center" && "flex justify-center")}>
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-white/30">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-white underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white/90">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {eyebrow && (
          <p className={cn("text-xs font-bold uppercase tracking-[0.18em] text-brand-gold", align === "center" && "flex justify-center")}>
            {eyebrow}
          </p>
        )}

        <h1 className={cn("mt-2 text-4xl font-extrabold tracking-tight md:text-5xl", align === "center" && "mx-auto max-w-3xl")}>
          {title}
        </h1>

        {subtitle && (
          <p className={cn("mt-4 max-w-2xl text-white/70 leading-relaxed", align === "center" && "mx-auto")}>{subtitle}</p>
        )}

        {children && (
          <div className={cn("mt-7 flex flex-wrap gap-3", align === "center" && "justify-center")}>{children}</div>
        )}
      </div>
    </section>
  );
}
