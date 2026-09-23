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

  return (
    <section className={cn("relative w-full overflow-hidden bg-[#0F2A1A]", className)}>
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
      <div className="absolute -right-[15%] -top-[30%] h-[70%] w-[45%] rounded-full bg-[#D6FF57]/20 blur-[80px]" />
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.18]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F2A1A]/40 via-[#0F2A1A]/80 to-[#0F2A1A]" />

      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-14 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className={cn("mx-auto max-w-[1200px]", centered ? "text-center" : "text-left")}>
          {crumbs && crumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className={cn("mb-6 flex text-[11px] font-bold uppercase tracking-wide text-white/50", centered ? "justify-center" : "justify-start")}>
              <ol className="flex flex-wrap items-center gap-1.5">
                {crumbs.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-white/20">/</span>}
                    {c.href ? (
                      <Link href={c.href} className="hover:text-white hover:underline">
                        {c.name}
                      </Link>
                    ) : (
                      <span className="text-white">{c.name}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {pill && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D6FF57] backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#D6FF57] animate-pulse" />
              {pill}
            </span>
          )}

          <h1 className={cn("mt-5 font-display text-[clamp(2rem,4.5vw,3.6rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase", centered && "mx-auto max-w-[18ch]")}>
            {title}
          </h1>

          {subtitle && (
            <p className={cn("mt-4 max-w-[60ch] text-[15px] leading-[1.6] text-white/70", centered ? "mx-auto" : "")}>{subtitle}</p>
          )}

          {ctas && ctas.length > 0 && (
            <div className={cn("mt-7 flex flex-wrap gap-3", centered ? "justify-center" : "justify-start")}>
              {ctas.map((cta) =>
                cta.primary ? (
                  <Link key={cta.label} href={cta.href} className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#c8f030]">
                    {cta.label} <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white"><ArrowRight size={12} /></span>
                  </Link>
                ) : (
                  <Link key={cta.label} href={cta.href} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
                    {cta.label}
                  </Link>
                ),
              )}
            </div>
          )}

          {children && <div className={cn("mt-6", centered && "flex justify-center")}>{children}</div>}
        </div>

        {split && image && (
          <div className="mx-auto mt-10 max-w-[1200px] grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="order-2 lg:order-1">
              {/* text already rendered above, this is for split layout image only */}
            </div>
            <div className="order-1 lg:order-2">
              <div className="overflow-hidden rounded-[20px] bg-white p-2 shadow-xl">
                <Image src={image.src} alt={image.alt} width={800} height={600} className="h-auto w-full rounded-[14px] object-cover" />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
