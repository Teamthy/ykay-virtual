import { Progress } from "@/components/ui/progress";

// Success-rate band — "Get top grades in tests & exams" with per-subject
// success percentages (reference 003243).

const RATES = [
  { subject: "Math", pct: 98 },
  { subject: "English", pct: 89 },
  { subject: "Science", pct: 92 },
];

export function SuccessRateBand() {
  return (
    <section className="py-20 bg-surface-muted">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">Test Prep</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy">
            Get top grades in tests &amp; exams
          </h2>
          <p className="mt-4 text-ink-600 leading-relaxed">
            Prepare for entrance exams into top schools in Nigeria &amp; the UK — Loyola Jesuit,
            Grange, St. Saviour&apos;s, King&apos;s College UK, CIS and federal schools — with
            past-paper practice and mock examinations.
          </p>
          <a href="/exam-prep" className="mt-6 inline-block rounded-full bg-brand-gold px-7 py-3 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5">
            Start exam prep
          </a>
        </div>
        <div className="space-y-6 rounded-3xl border border-ink-100 bg-white p-8 shadow-soft">
          {RATES.map((r) => (
            <div key={r.subject}>
              <Progress label={`${r.subject} success rate`} value={r.pct} />
            </div>
          ))}
          <p className="pt-2 text-xs text-ink-400">
            Success rate across our 2025–26 exam cohorts (WAEC, NECO, Common Entrance, SAT).
          </p>
        </div>
      </div>
    </section>
  );
}
