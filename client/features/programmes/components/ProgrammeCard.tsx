import Link from "next/link";

export type ProgrammeCardData = {
  id: string;
  title: string;
  slug: string;
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

// Programme card per working-doc §8.1: title, curriculum, level, subject,
// format, next start, CTA.
export function ProgrammeCard({ p }: { p: ProgrammeCardData }) {
  const nextStart = p.next_start ? new Date(p.next_start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  return (
    <Link href={`/programmes/${p.slug}`} className="border rounded-2xl p-6 hover:shadow-lift hover:border-brand-blue/40 transition-all bg-white flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
          {p.format.replace(/_/g, " ").toLowerCase()}
        </span>
        {p.is_featured && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-gold bg-amber-50 px-2.5 py-1 rounded-full">Featured</span>
        )}
      </div>
      <h3 className="font-bold leading-snug mt-3">{p.title}</h3>
      <p className="mt-1.5 text-xs text-ink-500">
        {[p.curriculum_name, p.level_name, p.exam_name].filter(Boolean).join(" · ")}
      </p>
      {(p.subjects?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {p.subjects!.slice(0, 4).map((s) => (
            <span key={s} className="text-[10px] bg-ink-50 text-ink-600 px-2 py-0.5 rounded-full">{s}</span>
          ))}
          {(p.subjects?.length ?? 0) > 4 && <span className="text-[10px] text-ink-400 self-center">+{p.subjects!.length - 4}</span>}
        </div>
      )}
      {p.summary && <p className="mt-3 text-sm text-ink-600 line-clamp-2 flex-1">{p.summary}</p>}
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
        <div className="text-xs text-ink-500">
          {nextStart ? <>Next start: <span className="font-semibold text-ink-700">{nextStart}</span></> : "Starts soon"}
        </div>
        <span className="text-sm font-extrabold text-brand-blue">
          {p.price_min != null ? `${p.currency} ${p.price_min.toLocaleString()}${p.price_max && p.price_max !== p.price_min ? `–${p.price_max.toLocaleString()}` : ""}` : "Price on request"}
        </span>
      </div>
    </Link>
  );
}
