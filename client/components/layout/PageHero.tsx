import Link from "next/link";
import { cn } from "@/lib/utils";

// PageHero — the PrebuiltUI hero template, applied to EVERY non-home page
// (the HOMEPAGE keeps its own image slider). Matches the reference template
// exactly: grid background, Poppins type, optional announcement pill, oversized
// headline, subtitle and a CTA row. The app's global Header/MobileNav render
// separately (the template's own nav is NOT duplicated here).

const GRID_BG =
  "url('https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/hero/gridBackground.png')";

export type Crumb = { name: string; href?: string };
export type HeroCTA = { label: string; href: string; primary?: boolean };

export type PageHeroProps = {
  title: string;
  subtitle?: string;
  /** Small pill shown above the headline ("New announcement…"). */
  announcement?: string;
  /** Eyebrow pill (kept for existing callers that pass `eyebrow`). */
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
      className={cn(
        "w-full bg-no-repeat bg-cover bg-center font-poppins text-sm",
        className
      )}
      style={{ backgroundImage: GRID_BG }}
    >
      <div
        className={cn(
          "mx-auto max-w-[1100px] px-6 pb-28 pt-16 md:pb-40 md:pt-24",
          centered && "flex flex-col items-center text-center"
        )}
      >
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-500">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c, i) => (
                <li key={c.name} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-ink-300">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-ink-700 hover:underline underline-offset-2">
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
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-medium text-ink-700 hover:border-slate-400/70",
              centered ? "mx-auto" : ""
            )}
          >
            <span>{pill}</span>
            <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M3.959 9.5h11.083m0 0L9.501 3.958M15.042 9.5l-5.541 5.54" stroke="#050040" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}

        <h1
          className={cn(
            "mt-8 text-4xl font-medium tracking-tight text-slate-900 md:text-7xl",
            centered && "mx-auto max-w-[850px]"
          )}
        >
          {title}
        </h1>

        {subtitle && (
          <p className={cn("mt-6 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base", centered && "mx-auto")}>
            {subtitle}
          </p>
        )}

        {(ctas && ctas.length > 0) && (
          <div className={cn("mt-7 flex flex-wrap items-center gap-3", centered && "justify-center")}>
            {ctas.map((cta) =>
              cta.primary ? (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="rounded-full bg-slate-800 px-6 py-3 font-medium text-white transition hover:bg-black"
                >
                  {cta.label}
                </Link>
              ) : (
                <Link
                  key={cta.label}
                  href={cta.href}
                  className="flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 font-medium transition hover:bg-slate-200/30"
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
