import Link from "next/link";
import { cn } from "@/lib/utils";

// PageHero — clean top-left page header: breadcrumbs, h1, subtitle, optional
// CTA row. No coloured band (per brand directive: heroes top-left with h1).

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
  return (
    <section className={cn("bg-surface", className)}>
      <div className={cn("mx-auto max-w-[1400px] px-6 py-10 md:px-10 md:py-14", align === "center" && "text-center")}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className={cn("mb-4 text-xs text-ink-500", align === "center" && "flex justify-center")}>
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
          <p className={cn("text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark", align === "center" && "flex justify-center")}>
            {eyebrow}
          </p>
        )}

        <h1 className={cn("mt-1 font-display text-4xl tracking-[0.02em] text-brand-navy md:text-5xl", align === "center" && "mx-auto max-w-3xl")}>
          {title}
        </h1>

        {subtitle && (
          <p className={cn("mt-3 max-w-2xl leading-relaxed text-ink-600", align === "center" && "mx-auto")}>{subtitle}</p>
        )}

        {children && (
          <div className={cn("mt-6 flex flex-wrap gap-3", align === "center" && "justify-center")}>{children}</div>
        )}
      </div>
    </section>
  );
}
