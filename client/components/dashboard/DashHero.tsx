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
    <section className="relative isolate overflow-hidden rounded-3xl bg-deep p-6 text-white shadow-card md:p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home/ribs-green.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-deep via-deep/92 to-deep/70" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-primary text-ink-900">
            {icon}
          </div>
          {kicker && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{kicker}</p>
          )}
          <h2 className="mt-1 font-display text-2xl tracking-wide md:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-white/75">{body}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
          <Clock size={18} className="mx-auto text-primary" />
          <p className="mt-1 text-sm font-bold">{chipTitle}</p>
          {chipHint && <p className="text-[11px] text-white/60">{chipHint}</p>}
        </div>
      </div>
      {ctaHref && ctaLabel && (
        <div className="relative z-10 mt-6 flex justify-end">
          <Link
            href={ctaHref}
            className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-bold text-deep hover:bg-primary"
          >
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
  onClick,
  image,
}: {
  title: string;
  body: string;
  href: string;
  link: string;
  icon: React.ReactNode;
  onClick?: () => void;
  image?: string;
}) {
  const inner = (
    <>
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/80 to-deep/35" />
        </>
      ) : (
        <div className="absolute inset-0 bg-deep" />
      )}
      <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-end p-5 text-white">
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-primary text-deep">{icon}</div>
        <h3 className="font-display text-xl leading-tight">{title}</h3>
        <p className="mt-1 text-sm text-white/75">{body}</p>
        <span className="mt-3 inline-flex text-sm font-bold text-primary">{link}</span>
      </div>
    </>
  );

  const className =
    "relative isolate block overflow-hidden rounded-3xl shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} w-full text-left`}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
