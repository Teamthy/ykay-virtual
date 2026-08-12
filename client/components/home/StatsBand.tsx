// Stats band — Tuteria v2: "Learn from the largest community of professional
// tutors in Africa" with 10k+ / 280k+ / 38k+ / 98%.

const STATS = [
  { value: "10k+", label: "Exceptional tutors" },
  { value: "280k+", label: "Lessons taught" },
  { value: "38k+", label: "Students supported" },
  { value: "98%", label: "Success rate" },
];

const PRESS = ["Forbes", "internet.org", "BBC", "Microsoft", "TEF"];

export function StatsBand() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <p className="text-center font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
          Learn From The Largest Community Of Professional Tutors In Africa
        </p>
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-4xl tracking-[0.02em] text-brand-navy md:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-semibold text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400">
          We are backed by
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
