import { cn } from "@/lib/utils";

/** Shared dashboard wrapper — full bleed, professional, same theme as home reference */
export function DashboardPage({
  children,
  className,
  title,
  subtitle,
  actions,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-screen w-full bg-[#F9F6ED]", className)}>
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:py-8">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {title && <h2 className="font-display text-[clamp(1.4rem,2.5vw,2rem)] leading-[0.95] tracking-[-0.02em] text-[#0F2A1A] uppercase">{title}</h2>}
              {subtitle && <p className="mt-2 text-[14px] leading-relaxed text-[#0F2A1A]/60 max-w-[60ch]">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
