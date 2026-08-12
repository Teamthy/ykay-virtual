import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";

export type CohortCardData = {
  id: string;
  title: string;
  href?: string; // overrides /cohorts/{id}/enroll (dummy showcase → real page)
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

// Cohort card — v2.tuteria.com treatment: tinted header, display title,
// schedule/seat chips, price + CTA footer.
export function CohortCard({ c }: { c: CohortCardData }) {
  const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
  const full = seatsLeft === 0;
  const fill = c.capacity > 0 ? Math.min((c.enrolled_count / c.capacity) * 100, 100) : 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-card">
      {/* Tinted header */}
      <div className="flex items-center justify-between gap-2 bg-brand-blue-light px-6 py-4">
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-blue">
          Cohort
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
          <MapPin size={12} />
          {c.location_mode === "IN_PERSON" ? "In person" : c.location_mode === "HYBRID" ? "Hybrid" : "Online"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl leading-snug tracking-[0.02em] text-brand-navy">
          {c.title}
        </h3>
        {c.programme_title && <p className="mt-1 text-xs font-semibold text-ink-500">{c.programme_title}</p>}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
          <CalendarDays size={13} className="text-brand-blue" />
          {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} →{" "}
          {new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          <span className="text-ink-300">·</span> {c.timezone}
        </div>

        {c.schedule_description && (
          <p className="mt-2 text-xs text-ink-500 line-clamp-2">{c.schedule_description}</p>
        )}

        {/* Seat bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-ink-600">
              <Users size={13} className="text-brand-blue" />
              {full ? "Cohort full" : `${seatsLeft} of ${c.capacity} seats left`}
            </span>
            <span className="font-bold text-brand-navy">{Math.round(fill)}% filled</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${fill >= 90 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-brand-green"}`}
              style={{ width: `${fill}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
          <span className="text-sm font-extrabold text-brand-navy">
            {c.currency} {c.fee.toLocaleString()}
          </span>
          <Link
            href={full ? "/cohorts" : (c.href ?? `/cohorts/${c.id}/enroll`)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
              full
                ? "bg-ink-100 text-ink-400 cursor-not-allowed"
                : "bg-brand-navy text-white hover:bg-brand-blue"
            }`}
            aria-disabled={full}
          >
            {full ? "Cohort full" : "Enrol now"}
            {!full && <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
          </Link>
        </div>
      </div>
    </div>
  );
}
