import { cn } from "@/lib/utils";
import { HeroIntro } from "@/components/ui/motion";

/**
 * Editorial detail-page hero: a full-bleed forest band with a readable cream
 * card. Detail pages can keep their richer inner content (tags, price cards,
 * CTAs) without painting dark type directly onto the dark band.
 */
type InnerHeroProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "split" | "centered" | "imageLeft";
  image?: { src: string; alt: string };
  eyebrow?: string;
};

export function InnerHero({
  children,
  className,
  variant = "split",
  image,
  eyebrow,
}: InnerHeroProps) {
  return (
    <section className={cn("full-bleed relative bg-[#0F2A1A] py-8 sm:py-12 lg:py-16", className)}>
      <div className="container-x">
        <div className={cn(
          "relative overflow-hidden rounded-[20px] bg-[#F9F6ED] p-6 text-[#0F2A1A] shadow-[0_16px_50px_rgba(0,0,0,0.15)] sm:p-10 lg:p-12",
          variant === "centered" && "mx-auto text-center",
          variant === "imageLeft" && image && "grid items-center gap-8 lg:grid-cols-[0.8fr_1fr] lg:gap-12",
        )}>
          {variant === "imageLeft" && image && (
            <div className="overflow-hidden rounded-[20px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
          <div className={cn(variant === "centered" && "mx-auto max-w-[900px]")}>
            {eyebrow && <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">{eyebrow}</p>}
            <HeroIntro>{children}</HeroIntro>
          </div>
        </div>
      </div>
    </section>
  );
}
