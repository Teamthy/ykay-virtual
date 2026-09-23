import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

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
  image?: { src: string; alt: string };
  cover?: string;
  children?: React.ReactNode;
  className?: string;
};

/** The shared full-bleed hero used by marketing listings and detail pages. */
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
  const split = Boolean(image && !cover);

  return (
    <section className={cn("relative isolate w-full overflow-hidden bg-[#0F2A1A] text-white", className)}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0F2A1A] via-[#0F2A1A]/90 to-[#0F2A1A]/75" />
      <div aria-hidden="true" className="absolute -right-24 -top-48 size-[500px] rounded-full bg-[#D6FF57]/10 blur-[100px]" />

      <div className={cn(
        "container-x relative grid items-center gap-8 py-14 lg:py-20",
        split && "lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:gap-16",
      )}>
        <div className={cn(!split && "mx-auto w-full max-w-[1200px]", centered && !split ? "text-center" : "text-left")}>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className={cn("mb-6 flex text-[11px] font-bold uppercase tracking-wide text-white/70", centered && !split ? "justify-center" : "justify-start")}>
              <ol className="flex flex-wrap items-center gap-2">
                {crumbs.map((crumb, i) => (
                  <li key={crumb.name} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="text-white/65">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-white/70 hover:text-[#D6FF57] hover:underline">{crumb.name}</Link>
                    ) : (
                      <span className="text-white">{crumb.name}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {pill && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6FF57]">
              <span className="size-1.5 rounded-full bg-[#D6FF57]" /> {pill}
            </span>
          )}
          <h1 className={cn(
            "mt-5 font-display text-[clamp(2.5rem,5vw,5rem)] uppercase leading-[0.92] tracking-[-0.02em] text-white",
            centered && !split && "mx-auto max-w-[18ch]",
          )}>{title}</h1>
          {subtitle && (
            <p className={cn("mt-5 max-w-[60ch] text-[14px] leading-[1.7] text-white/80 sm:text-[16px]", centered && !split && "mx-auto")}>{subtitle}</p>
          )}

          {ctas && ctas.length > 0 && (
            <div className={cn("mt-8 flex flex-wrap gap-3", centered && !split && "justify-center")}>
              {ctas.map((cta) => cta.primary ? (
                <Link key={`${cta.href}-${cta.label}`} href={cta.href} className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">
                  {cta.label} <ArrowRight size={14} />
                </Link>
              ) : (
                <Link key={`${cta.href}-${cta.label}`} href={cta.href} className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
                  {cta.label}
                </Link>
              ))}
            </div>
          )}
          {children && <div className={cn("mt-7 flex flex-wrap gap-3", centered && !split && "justify-center")}>{children}</div>}
        </div>

        {split && image && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border border-white/20 bg-[#194732] shadow-[0_25px_70px_rgba(0,0,0,0.25)] sm:aspect-[16/10] lg:aspect-[4/3]">
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1023px) 100vw, 40vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
