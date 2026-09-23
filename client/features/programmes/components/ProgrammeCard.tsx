import Link from "next/link";
import { ArrowRight, CalendarDays, GraduationCap, Layers } from "lucide-react";
import { coverFor } from "@/lib/covers";

export type ProgrammeCardData = {
  id: string;
  title: string;
  slug: string;
  href?: string;
  summary?: string;
  format: string;
  curriculum_name?: string;
  level_name?: string;
  exam_name?: string;
  subjects?: string[];
  price_min?: number;
  price_max?: number;
  currency: string;
  is_featured: boolean;
  next_start?: string;
};

const FORMAT_META: Record<string, { label: string; dot: string }> = {
  COHORT: { label: "Cohort", dot: "bg-emerald-500" },
  PRIVATE: { label: "Private", dot: "bg-orange-500" },
  BOOTCAMP: { label: "Bootcamp", dot: "bg-[#D6FF57]" },
  HOLIDAY: { label: "Holiday", dot: "bg-amber-500" },
  ONLINE_CLASS: { label: "Online Class", dot: "bg-[#0F2A1A]" },
  HYBRID: { label: "Hybrid", dot: "bg-violet-500" },
};

export function ProgrammeCard({ p }: { p: ProgrammeCardData }) {
  const fmt = FORMAT_META[p.format] ?? { label: p.format.replace(/_/g, " ").toLowerCase(), dot: "bg-[#0F2A1A]" };
  const nextStart = p.next_start ? new Date(p.next_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  const metaLine = [p.curriculum_name, p.level_name, p.exam_name].filter(Boolean).join(" · ");

  return (
    <Link
      href={p.href ?? `/programmes/${p.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_8px_32px_rgba(15,42,26,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(15,42,26,0.14)] hover:border-[#0F2A1A]/15"
    >
      {/* image header */}
      <div className="relative h-[190px] overflow-hidden bg-[#0F2A1A]">
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.05]"
          style={{ backgroundImage: `url(${coverFor(p.title)})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F2A1A]/20 to-transparent mix-blend-multiply" />

        {/* top pills */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A] shadow-sm backdrop-blur">
            <span className={`size-2 rounded-full ${fmt.dot}`} />
            {fmt.label}
          </span>
          {p.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D6FF57] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A] shadow-sm">
              <GraduationCap size={12} /> Featured
            </span>
          )}
        </div>

        {/* price badge */}
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">Starting from</p>
            <p className="mt-1 font-display text-[22px] leading-none text-white">
              {p.price_min != null ? `${p.currency} ${p.price_min.toLocaleString()}${p.price_max && p.price_max !== p.price_min ? `–${p.price_max.toLocaleString()}` : ""}` : "Price on request"}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-full bg-white text-[#0F2A1A] shadow-lg transition group-hover:bg-[#D6FF57]">
            <ArrowRight size={16} />
          </span>
        </div>
      </div>

      {/* content */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-[20px] leading-[1.1] tracking-[-0.01em] text-[#0F2A1A] transition-colors group-hover:text-[#0F2A1A] line-clamp-2">
          {p.title}
        </h3>
        {metaLine && <p className="mt-2 text-[12px] font-semibold text-[#0F2A1A]/65 line-clamp-1">{metaLine}</p>}

        {(p.subjects?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {p.subjects!.slice(0, 3).map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-[#F9F6ED] px-2.5 py-1 text-[11px] font-semibold text-[#0F2A1A]/75">
                <Layers size={10} className="text-[#0F2A1A]/65" /> {s}
              </span>
            ))}
            {(p.subjects?.length ?? 0) > 3 && <span className="inline-flex items-center rounded-full bg-[#0F2A1A] px-2.5 py-1 text-[11px] font-bold text-white">+{p.subjects!.length - 3}</span>}
          </div>
        )}

        {p.summary && <p className="mt-4 line-clamp-2 text-[13px] leading-[1.6] text-[#0F2A1A]/70">{p.summary}</p>}

        <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-4">
          <div className="flex items-center gap-1.5 text-[12px] text-[#0F2A1A]/65">
            <CalendarDays size={14} className="text-[#0F2A1A]" />
            {nextStart ? <span className="font-semibold text-[#0F2A1A]/75">{nextStart}</span> : <span className="font-medium">Start date not published</span>}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A] group-hover:underline">View programme</span>
        </div>
      </div>
    </Link>
  );
}
