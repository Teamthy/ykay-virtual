import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { HeroIntro } from "@/components/ui/motion";

// PageHero — the UNIFORM hero for every non-home page. Self-contained: the
// background is an inline SVG grid (no remote asset) unless `cover` is set,
// in which case a local /hero photo is painted under a navy scrim so title,
// crumbs and CTAs stay light. Never put dark ink on a photo or navy field.

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
  /** Optional split-hero image (bundled, local) — rendered right of the text. */
  image?: { src: string; alt: string };
  /** Full-bleed photo behind the hero copy (local /hero/*.jpg). */
  cover?: string;
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
  image,
  cover,
  children,
  className,
}: PageHeroProps) {
  const pill = announcement ?? eyebrow;
  const centered = align === "center";
  const split = Boolean(image) && !cover;
  const navyTone =
    Boolean(className?.includes("bg-deep")) ||
    Boolean(className?.includes("from-deep")) ||
    Boolean(className?.includes("from-[#060F26]"));
  const onPhoto = Boolean(cover) || navyTone;

  const backgroundImage = cover
    ? `linear-gradient(180deg, rgba(6,15,38,0.76) 0%, rgba(6,15,38,0.88) 100%), url("${cover}")`
    : GRID_BG;

  const text = (
    <>
      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className={cn(
            "mb-6 text-xs",
            onPhoto ? "text-white/70" : "text-ink-500",
          )}
        >
          <ol
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              centered && !split && "justify-center",
            )}
          >
            {crumbs.map((c, i) => (
              <li key={c.name} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    className={onPhoto ? "text-white/40" : "text-ink-300"}
                  >
                    /
                  </span>
                )}
                {c.href ? (
                  <Link
                    href={c.href}
                    className={cn(
                      "underline-offset-2 hover:underline",
                      onPhoto
                        ? "text-white/80 hover:text-white"
                        : "hover:text-deep",
                    )}
                  >
                    {c.name}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "font-medium",
                      onPhoto ? "text-white" : "text-ink-700",
                    )}
                  >
                    {c.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {pill && (
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em]",
            onPhoto
              ? "border-white/30 bg-white/10 text-white"
              : "border-ink-200 bg-white text-deep",
          )}
        >
          <span className="size-1.5 rounded-full bg-primary" />
          {pill}
        </span>
      )}

      <h1
        className={cn(
          "mt-6 font-display text-4xl leading-[1.08] tracking-[0.01em] md:text-6xl",
          onPhoto ? "text-white drop-shadow-sm" : "text-deep",
          centered && !split && "mx-auto max-w-[850px]",
        )}
      >
        {title}
      </h1>

      {subtitle && (
        <p
          className={cn(
            "mt-5 max-w-2xl text-base leading-relaxed md:text-lg",
            onPhoto ? "text-white/85" : "text-ink-600",
            centered && !split && "mx-auto",
          )}
        >
          {subtitle}
        </p>
      )}

      {ctas && ctas.length > 0 && (
        <div
          className={cn(
            "mt-8 flex flex-wrap items-center gap-3",
            centered && !split && "justify-center",
          )}
        >
          {ctas.map((cta) =>
            cta.primary ? (
              <Link
                key={cta.label}
                href={cta.href}
                className="rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-primary-hover"
              >
                {cta.label}
              </Link>
            ) : (
              <Link
                key={cta.label}
                href={cta.href}
                className={cn(
                  "rounded-full border px-7 py-3.5 text-sm font-bold transition",
                  onPhoto
                    ? "border-white/50 text-white hover:bg-white/10"
                    : "border-ink-300 text-ink-800 hover:border-deep hover:bg-deep hover:text-white",
                )}
              >
                {cta.label}
              </Link>
            ),
          )}
        </div>
      )}

      {children && (
        <div
          className={cn(
            "mt-7 flex flex-wrap gap-3",
            centered && !split && "justify-center",
            onPhoto && "[&_a]:text-inherit",
          )}
        >
          {children}
        </div>
      )}
    </>
  );

  return (
    <section
      className={cn(
        "w-full border-b bg-no-repeat bg-cover bg-center",
        onPhoto
          ? "border-white/10 text-white"
          : "border-ink-100 bg-surface text-ink-800",
        className,
      )}
      style={{ backgroundImage }}
    >
      {split ? (
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <HeroIntro>{text}</HeroIntro>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-100">
              <Image
                src={image!.src}
                alt={image!.alt}
                width={960}
                height={720}
                priority
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 48vw"
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "mx-auto max-w-[1100px] px-6 pb-16 pt-14 md:pb-24 md:pt-20",
            centered && "flex flex-col items-center text-center",
          )}
        >
          <HeroIntro>{text}</HeroIntro>
        </div>
      )}
    </section>
  );
}
