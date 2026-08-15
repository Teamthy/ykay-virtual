import { cn } from "@/lib/utils";

// InnerHero — the PrebuiltUI template's background treatment (grid pattern,
// Poppins type) applied as a wrapper around a page's EXISTING header content.
// Used on data-rich detail pages (programmes/[slug], subjects/[slug],
// tutors/[slug], cohorts/[id], blog/[slug], …) where a full marketing hero
// with forced title/CTAs would discard essential content (tags, CTA cards,
// stats, avatars). The grid + Poppins keep it visually consistent with the
// template on every non-home page.

const GRID_BG =
  "url('https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/hero/gridBackground.png')";

export function InnerHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "w-full bg-no-repeat bg-cover bg-center font-poppins text-sm",
        className
      )}
      style={{ backgroundImage: GRID_BG }}
    >
      <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
        {children}
      </div>
    </section>
  );
}
