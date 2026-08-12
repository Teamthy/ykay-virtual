// "Our Innovative Approach Ensures Your Child Achieves Stellar Results" —
// Tuteria v2 five-point methodology with real copy.

const STEPS = [
  {
    n: "1",
    title: "Tuteria Insights ™ Assessment",
    desc: "Our tailored assessments measure your child's current academic level and give you actionable insights into their strengths and weaknesses and how to overcome them.",
  },
  {
    n: "2",
    title: "Adaptive Learning Plans",
    desc: "We prepare a personalized learning path adapted to empower your child to step into each classroom session with confidence and enthusiasm.",
  },
  {
    n: "3",
    title: "Child-Centered Learning",
    desc: "Rather than molding children to fit a standardized mold, we mold education to fit each child — blending innate curiosity with structured knowledge.",
  },
  {
    n: "4",
    title: "Periodic Evaluation",
    desc: "We monitor your child's progress every step of the way to drive continuous improvement and informed decision-making.",
  },
  {
    n: "5",
    title: "Progress Reports & Reviews",
    desc: "You receive progress reports on your child's growth with highlights on strong and weak areas plus actionable recommendations.",
  },
];

export function ApproachSection() {
  return (
    <section className="border-t border-ink-100 bg-surface-muted py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
            We deliver the best results, period.
          </p>
          <p className="mt-3 text-lg font-semibold text-ink-600">
            NUVORA students perform 3x better in class and school exams
          </p>
          <h2 className="mt-8 font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
            Our Innovative Approach Ensures Your Child Achieves Stellar Results
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <div className="font-display text-4xl tracking-[0.02em] text-brand-gold-dark">{s.n}</div>
              <h3 className="mt-3 text-sm font-bold uppercase tracking-wide text-ink-800">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/private-tuition"
            className="inline-block rounded-full bg-brand-gold px-9 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
          >
            Get started today
          </a>
        </div>
      </div>
    </section>
  );
}
