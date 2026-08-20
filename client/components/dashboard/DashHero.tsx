import Link from "next/link";
import { Clock } from "lucide-react";

export function DashHero({
  kicker,
  title,
  body,
  chipTitle,
  chipHint,
  ctaHref,
  ctaLabel,
  icon,
}: {
  kicker?: string;
  title: string;
  body: string;
  chipTitle: string;
  chipHint?: string;
  ctaHref?: string;
  ctaLabel?: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-deep p-6 text-white shadow-card md:p-8">
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-brand-gold/15" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand-gold text-ink-900">{icon}</div>
          {kicker && <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">{kicker}</p>}
          <h2 className="mt-1 font-display text-2xl tracking-wide md:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-white/75">{body}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
          <Clock size={18} className="mx-auto text-brand-gold" />
          <p className="mt-1 text-sm font-bold">{chipTitle}</p>
          {chipHint && <p className="text-[11px] text-white/60">{chipHint}</p>}
        </div>
      </div>
      {ctaHref && ctaLabel && (
        <div className="mt-6 flex justify-end">
          <Link href={ctaHref} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-deep hover:bg-brand-gold">
            {ctaLabel}
          </Link>
        </div>
      )}
    </section>
  );
}

export function SideCard({
  title,
  body,
  href,
  link,
  icon,
}: {
  title: string;
  body: string;
  href: string;
  link: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="mb-3 grid size-10 place-items-center rounded-full bg-brand-gold-light text-deep">{icon}</div>
      <h3 className="font-bold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500">{body}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-bold text-brand-gold-dark hover:underline">
        {link}
      </Link>
    </div>
  );
}
