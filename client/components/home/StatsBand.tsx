// Stats band — reference-grade marketplace proof: 10k+ tutors · 280k+ lessons
// · 38k+ students, with a press-marks strip.

const STATS = [
  { value: "10k+", label: "Exceptional tutors" },
  { value: "280k+", label: "Lessons taught" },
  { value: "38k+", label: "Students supported" },
];

const PRESS = ["Forbes", "internet.org", "BBC", "Microsoft", "TEF"];

export function StatsBand() {
  return (
    <section className="bg-white py-10">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-3xl border border-ink-100 bg-surface-muted px-8 py-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-4xl font-extrabold tracking-tight text-brand-navy">{s.value}</p>
              <p className="mt-1 text-sm font-semibold text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">
          Proudly recognised by
        </p>
        <div className="mt-3 flex justify-center items-center gap-8 flex-wrap">
          {PRESS.map((p) => (
            <span key={p} className="text-sm font-extrabold uppercase tracking-wide text-ink-300">
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
