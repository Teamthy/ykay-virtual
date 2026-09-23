import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

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
    <section className="relative isolate overflow-hidden rounded-[24px] bg-[#0F2A1A] p-6 text-white shadow-[0_8px_40px_rgba(15,42,26,0.15)] md:p-8">
      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
      <div className="absolute -right-[20%] -top-[30%] h-[80%] w-[50%] rounded-full bg-[#D6FF57]/20 blur-[80px]" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-4 grid size-11 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
            {icon}
          </div>
          {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D6FF57]">{kicker}</p>}
          <h2 className="mt-2 font-display text-[clamp(1.4rem,2.5vw,2rem)] leading-[0.9] tracking-[-0.02em] uppercase">{title}</h2>
          <p className="mt-3 text-[14px] leading-[1.6] text-white/70">{body}</p>
        </div>
        <div className="rounded-[16px] bg-white p-4 text-[#0F2A1A] shadow-lg min-w-[160px]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/50">
            <Clock size={12} /> {chipHint || "Next"}
          </div>
          <p className="mt-2 text-[14px] font-extrabold leading-tight">{chipTitle}</p>
        </div>
      </div>
      {ctaHref && ctaLabel && (
        <div className="relative z-10 mt-6 flex justify-end">
          <Link href={ctaHref} className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#c8f030] transition">
            {ctaLabel} <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white"><ArrowRight size={12} /></span>
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
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A1A] via-[#0F2A1A]/70 to-[#0F2A1A]/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#0F2A1A]" />
      )}
      <div className="relative z-10 flex h-full min-h-[200px] flex-col justify-end p-5 text-white">
        <div className="mb-3 grid size-10 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">{icon}</div>
        <h3 className="font-display text-[18px] leading-[0.95] uppercase">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-[1.4] text-white/70">{body}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#D6FF57]">{link} <ArrowRight size={12} /></span>
      </div>
    </>
  );

  const className = "relative isolate block overflow-hidden rounded-[20px] shadow-[0_4px_24px_rgba(15,42,26,0.12)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,42,26,0.18)]";

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
