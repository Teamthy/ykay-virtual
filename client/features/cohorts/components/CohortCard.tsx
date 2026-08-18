import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { coverFor } from "@/lib/covers";

export type CohortCardData = {
  id: string;
  title: string;
  href?: string;
  slug?: string;
  programme_title?: string;
  tutor_display_name?: string;
  start_date: string;
  end_date: string;
  timezone: string;
  schedule_description?: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  location_mode?: string;
};

export function CohortCard({ c }: { c: CohortCardData }) {
  const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
  const full = seatsLeft === 0;
  const fill = c.capacity > 0 ? Math.min((c.enrolled_count / c.capacity) * 100, 100) : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
      <div
        className="relative flex h-20 items-end justify-between gap-2 bg-cover bg-center px-4 py-2.5"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.2), rgba(6,15,38,0.82)), url(${coverFor(c.title + c.id)})`,
        }}
      >
        <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
          Cohort
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
          <MapPin size={11} />
          {c.location_mode === "IN_PERSON" ? "In person" : c.location_mode === "HYBRID" ? "Hybrid" : "Online"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-base leading-snug tracking-[0.02em] text-brand-navy">
          {c.title}
        </h3>
        {c.programme_title && <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-ink-500">{c.programme_title}</p>}

        <div className="mt-2 flex items-center gap-1 text-[11px] text-ink-500">
          <CalendarDays size={12} className="text-brand-blue" />
          {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} â†'{" "}
          {new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-ink-600">
              <Users size={12} className="text-brand-blue" />
              {full ? "Full" : `${seatsLeft} seats`}
            </span>
            <span className="font-bold text-brand-navy">{Math.round(fill)}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${fill >= 90 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-brand-green"}`}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
          <span className="text-sm font-extrabold text-brand-navy">
            {c.currency} {c.fee.toLocaleString()}
          </span>
          <Link
            href={full ? "/cohorts" : (c.href ?? `/cohorts/${c.id}/enroll`)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              full ? "cursor-not-allowed bg-ink-100 text-ink-400" : "bg-brand-navy text-white hover:bg-brand-blue"
            }`}
            aria-disabled={full}
          >
            {full ? "Full" : "Enrol"}
            {!full && <ArrowRight size={12} />}
          </Link>
        </div>
      </div>
    </div>
  );
}
