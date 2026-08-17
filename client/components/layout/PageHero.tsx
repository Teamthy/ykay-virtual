import Link from "next/link";
import { cn } from "@/lib/utils";

// PageHero — the UNIFORM hero for every non-home page. Self-contained: the
// background is an inline SVG grid (no remote asset), the palette is the
// NUVORA brand (Anton display, deep green, primary green, peach), and the
// rhythm (eyebrow → title → subtitle → CTAs) is identical across pages.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%2370F250' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

export type Crumb = { name: string; href?: string };
export type HeroCTA = { label: string; href: string; primary?: boolean };

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  announcement?: string;
  eyebrow?: string;
  crumbs?: Crumb[];
  ctas?: HeroCTA[];
  align?: "left" | "center";
  children?: React.ReactNode;
  className?: string;
};

export function PageHero({
  title,
  subtitle,
  announcement,
  eyebrow,
  crumbs,
  ctas,
  align = "center",
  children,
  className,
}: PageHeroProps) {
  const pill = announcement ?? eyebrow;
  const centered = align === "center";
  return (
    <section
      className={cn("w-full border-b border-ink-100 bg-surface bg-no-repeat bg-cover bg-center", className)}
      style={{ backgroundImage: GRID_BG }}
    >
      <div
        className={cn(
          "mx-auto max-w-[1100px] px-6 pb-16 pt-14 md:pb-24 md:pt-20",
          centered && "flex flex-col items-center text-center"
        )}
      >
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-500">
            <ol className="flex flex-wrap items-center justify-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-ink-300">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-brand-navy hover:underline underline-offset-2">
                      {c.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink-700">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {pill && (
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-navy">
            <span className="size-1.5 rounded-full bg-brand-gold" />
            {pill}
          </span>
        )}

        <h1
          className={cn(
            "mt-6 font-display text-4xl leading-[1.08] tracking-[0.01em] text-brand-navy md:text-6xl",
            centered && "mx-auto max-w-[850px]"
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p className={cn("mt-5 max-w-2xl text-base leading-relaxed text-ink-600 md:text-lg", centered && "mx-auto")}>
            {subtitle}
          </p>
        )}

        {ctas && ctas.length > 0 && (
          <div className={cn("mt-8 flex flex-wrap items-center gap-3", centered && "justify-center")}>
            {ctas.map((cta) =>
              cta.primary ? (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
                >
                  {cta.label}
                </Link>
              ) : (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="rounded-full border border-ink-300 px-7 py-3.5 text-sm font-bold text-ink-800 transition hover:border-brand-navy hover:bg-brand-navy hover:text-white"
                >
                  {cta.label}
                </Link>
              )
            )}
          </div>
        )}

        {children && <div className={cn("mt-7 flex flex-wrap gap-3", centered && "justify-center")}>{children}</div>}
      </div>
    </section>
  );
}
