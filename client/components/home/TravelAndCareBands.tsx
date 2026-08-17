import Link from "next/link";
import { Globe2, ArrowRight } from "lucide-react";

// Study-abroad closing band (Tuteria reference: "Admissions & Travels").
// (The healthcare/HCA strip was removed in Batch 2.)

export function TravelAndCareBands() {
  return (
    <section className="border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light px-4 py-1.5 text-xs font-bold text-brand-navy">
            <Globe2 size={13} /> Admissions &amp; Travels
          </p>
          <h2 className="mt-4 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
            Live, work and study abroad
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            Test prep and application coaching for study in the US, UK, Canada and Australia —
            we do not publish an unverified university-count.
          </p>
          <Link
            href="/study-abroad"
            className="group mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition-all hover:-translate-y-0.5 hover:bg-brand-gold-hover"
          >
            Start your journey
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl bg-[#111111] p-8 text-white shadow-card">
          <p className="font-display text-3xl tracking-[0.02em] text-white">Study destinations</p>
          <p className="mt-1 text-white/80">US, UK, Canada &amp; Australia — shortlisting with your advisor</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["IELTS", "GRE", "GMAT", "TOEFL", "SAT"].map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
