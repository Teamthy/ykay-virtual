import Link from "next/link";
import { Globe2, HeartPulse, ArrowRight } from "lucide-react";

// v2.tuteria.com closing bands: "Admissions & Travels" (study abroad) and
// "Become a Certified Caregiver" (HCA training) — real reference copy.

export function TravelAndCareBands() {
  return (
    <section className="border-t border-ink-100 bg-white">
      {/* Admissions & Travels */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 grid lg:grid-cols-[1fr_1fr] gap-10 items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light px-4 py-1.5 text-xs font-bold text-brand-navy">
            <Globe2 size={13} /> Admissions &amp; Travels
          </p>
          <h2 className="mt-4 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
            Live, work and study abroad
          </h2>
          <p className="mt-3 text-ink-600 leading-relaxed">
            Apply to <b>1600+ universities and colleges</b> in the US, UK, Canada, and Australia.
            Get expert help to study abroad with ease — from course selection to perfect test scores.
          </p>
          <Link
            href="/study-abroad"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
          >
            Start your journey
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl bg-[#111111] p-8 text-white shadow-card">
          <p className="font-display text-5xl tracking-[0.02em]">1600+</p>
          <p className="mt-1 text-white/80">universities &amp; colleges in the US, UK, Canada &amp; Australia</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["IELTS", "GRE", "GMAT", "TOEFL", "SAT"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* HCA strip */}
      <div className="border-t border-ink-100 bg-surface-muted">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-14 grid lg:grid-cols-[1fr_1fr] gap-8 items-center">
          <div className="flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand-green text-white">
              <HeartPulse size={26} />
            </span>
            <div>
              <p className="font-display text-2xl tracking-[0.02em] text-brand-navy">
                Become a Certified Caregiver, Work In Care Worldwide
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Get trained and certified as a Healthcare Assistant with hands-on practicals and clinical internship.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-start lg:justify-end">
            <span className="rounded-full bg-brand-green-light px-4 py-1.5 text-xs font-bold text-brand-green">
              180+ students enrolled
            </span>
            <Link
              href="/healthcare"
              className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
            >
              Join the Training <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
