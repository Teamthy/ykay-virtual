import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users, Clock, Video } from "lucide-react";
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
  const start = new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const end = new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_8px_32px_rgba(15,42,26,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(15,42,26,0.14)] hover:border-[#0F2A1A]/15">
      {/* cover */}
      <div className="relative h-[170px] overflow-hidden bg-[#0F2A1A]">
        <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-[1.06]" style={{ backgroundImage: `url(${coverFor(c.title + c.id)})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A] shadow-sm">
            <Video size={12} /> Cohort
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm ${fill >= 90 ? "bg-red-700 text-white" : fill >= 60 ? "bg-amber-300 text-[#0F2A1A]" : "bg-emerald-700 text-white"}`}>
            {full ? "Full" : `${seatsLeft} seats left`}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur">
            <MapPin size={12} className="text-[#D6FF57]" /> {c.location_mode === "IN_PERSON" ? "In person" : c.location_mode === "HYBRID" ? "Hybrid" : "Online"}
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 text-[12px] font-extrabold text-[#0F2A1A] shadow">{c.currency} {c.fee.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="line-clamp-2 font-display text-[19px] leading-[1.1] tracking-[-0.01em] text-[#0F2A1A]">{c.title}</h3>
        {c.programme_title && <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[#0F2A1A]/65">{c.programme_title}</p>}

        <div className="mt-4 flex items-center gap-2 text-[12px] text-[#0F2A1A]/70">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#F9F6ED] px-2.5 py-1">
            <CalendarDays size={12} className="text-[#0F2A1A]" /> {start} → {end}
          </span>
        </div>

        {c.schedule_description && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#0F2A1A]/65 line-clamp-1">
            <Clock size={12} /> {c.schedule_description} · {c.timezone}
          </p>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide">
            <span className="flex items-center gap-1 text-[#0F2A1A]/70"><Users size={12} className="text-[#0F2A1A]" /> Enrolment</span>
            <span className={fill >= 90 ? "text-red-600" : fill >= 60 ? "text-amber-600" : "text-emerald-700"}>{Math.round(fill)}% filled</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F9F6ED]">
            <div className={`h-full rounded-full transition-all duration-700 ${fill >= 90 ? "bg-red-500" : fill >= 60 ? "bg-amber-500" : "bg-[#0F2A1A]"}`} style={{ width: `${fill}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-[#0F2A1A]/65">{c.enrolled_count}/{c.capacity} enrolled · {seatsLeft} seats left</p>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Secure with escrow</span>
          <Link
            href={full ? "/cohorts" : (c.href ?? `/cohorts/${c.id}/enroll`)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition ${full ? "cursor-not-allowed bg-[#F9F6ED] text-[#0F2A1A]/65" : "bg-[#0F2A1A] text-white hover:bg-black group-hover:bg-[#D6FF57] group-hover:text-[#0F2A1A]"}`}
          >
            {full ? "Join waitlist" : "Enrol now"} {!full && <ArrowRight size={14} />}
          </Link>
        </div>
      </div>
    </div>
  );
}
