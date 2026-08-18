import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { coverFor } from "@/lib/covers";

export type ProgrammeCardData = {
  id: string;
  title: string;
  slug: string;
  href?: string; // overrides /programmes/{slug} (e.g. dummy showcase → real page)
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

const FORMAT_META: Record<string, { label: string; bg: string; color: string }> = {
  COHORT: { label: "Cohort", bg: "#DFFFF2", color: "#013920" },
  PRIVATE: { label: "Private Tuition", bg: "#FDF0E8", color: "#ED6D20" },
  BOOTCAMP: { label: "Bootcamp", bg: "#F2F9EE", color: "#009A49" },
  HOLIDAY: { label: "Holiday Programme", bg: "#FFF8E6", color: "#C9A227" },
  ONLINE_CLASS: { label: "Online Class", bg: "#DFFFF2", color: "#4CCB31" },
  HYBRID: { label: "Hybrid", bg: "#F2F9EE", color: "#009A49" },
};

// Programme card — v2.tuteria.com treatment: tinted format banner, display
// title, curriculum/level line, subject pills, next-start + price footer.
export function ProgrammeCard({ p }: { p: ProgrammeCardData }) {
  const fmt = FORMAT_META[p.format] ?? { label: p.format.replace(/_/g, " ").toLowerCase(), bg: "#DFFFF2", color: "#013920" };
  const nextStart = p.next_start ? new Date(p.next_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <Link
      href={p.href ?? `/programmes/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-card"
    >
      <div
        className="flex h-28 items-end justify-between bg-cover bg-center px-6 py-4"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.15), rgba(6,15,38,0.78)), url(${coverFor(p.title)})`,
        }}
      >
        <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-navy">
          {fmt.label}
        </span>
        {p.is_featured && (
          <span className="rounded-full bg-brand-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl leading-snug tracking-[0.02em] text-brand-navy transition-colors group-hover:text-brand-blue">
          {p.title}
        </h3>
        <p className="mt-1.5 text-xs font-semibold text-ink-500">
          {[p.curriculum_name, p.level_name, p.exam_name].filter(Boolean).join(" · ")}
        </p>

        {(p.subjects?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.subjects!.slice(0, 4).map((s) => (
              <span key={s} className="rounded-full bg-brand-blue-light px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue">
                {s}
              </span>
            ))}
            {(p.subjects?.length ?? 0) > 4 && <span className="text-[11px] text-ink-400 self-center">+{p.subjects!.length - 4}</span>}
          </div>
        )}

        {p.summary && <p className="mt-3 flex-1 text-sm text-ink-600 line-clamp-2">{p.summary}</p>}

        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-500">
            <CalendarDays size={13} className="text-brand-blue" />
            {nextStart ? <>Next: <span className="font-semibold text-ink-700">{nextStart}</span></> : "Starts soon"}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-brand-navy">
              {p.price_min != null ? `${p.currency} ${p.price_min.toLocaleString()}${p.price_max && p.price_max !== p.price_min ? `–${p.price_max.toLocaleString()}` : ""}` : "Price on request"}
            </span>
            <ArrowRight size={14} className="text-brand-blue transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
