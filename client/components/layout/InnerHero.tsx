import { cn } from "@/lib/utils";

// InnerHero — the inner-page hero wrapper with three deliberate variants
// (design audit A5: no repetitive single template):
//   - split     (default) full-width wrapper around the page's own header
//               content — detail pages with tags/stats/CTA cards
//   - centered  centered, copy-led heroes for article/listing pages
//   - imageLeft rounded image beside the content for subject/exam pages
// Flat surfaces only: subtle grid texture on split/centered, no gradients.

const GRID_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='%2370F250' stroke-opacity='0.10' stroke-width='1'/%3E%3C/svg%3E\")";

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
  if (variant === "imageLeft" && image) {
    return (
      <section className={cn("w-full border-b border-ink-100 bg-surface", className)}>
        <div className="mx-auto grid max-w-[1400px] items-center gap-8 px-6 py-10 md:grid-cols-[0.85fr_1fr] md:px-10 md:py-14">
          <div className="overflow-hidden rounded-xl border border-ink-100 shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>{children}</div>
        </div>
      </section>
    );
  }

  if (variant === "centered") {
    return (
      <section
        className={cn("w-full border-b border-ink-100 bg-surface bg-no-repeat bg-cover bg-center", className)}
        style={{ backgroundImage: GRID_BG }}
      >
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-14 text-center md:pb-16 md:pt-20">
          {eyebrow && (
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">{eyebrow}</p>
          )}
          {children}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("w-full border-b border-ink-100 bg-surface bg-no-repeat bg-cover bg-center", className)}
      style={{ backgroundImage: GRID_BG }}
    >
      <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-12 md:px-10 md:pb-14 md:pt-16">
        {children}
      </div>
    </section>
  );
}
