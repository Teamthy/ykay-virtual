import { ClipboardCheck, Route, HeartHandshake, Activity, FileBarChart } from "lucide-react";

// "Our Innovative Approach Ensures Your Child Achieves Stellar Results" —
// Tuteria v2 five-point methodology with real copy.

const STEPS = [
  {
    n: "1",
    icon: <ClipboardCheck size={28} />,
    title: "NUVORA Insights™ Assessment",
    desc: "Comprehensive evaluation of your child's current academic level, learning style and knowledge gaps to build a strong foundation.",
  },
  {
    n: "2",
    icon: <Route size={28} />,
    title: "Adaptive Learning Plans",
    desc: "A personalized learning path that empowers your child to step into each classroom session with confidence.",
  },
  {
    n: "3",
    icon: <HeartHandshake size={28} />,
    title: "Child-Centered Learning",
    desc: "We mold education to fit each child — blending innate curiosity with structured knowledge.",
  },
  {
    n: "4",
    icon: <Activity size={28} />,
    title: "Periodic Evaluation",
    desc: "We monitor your child's progress every step of the way to drive continuous improvement.",
  },
  {
    n: "5",
    icon: <FileBarChart size={28} />,
    title: "Progress Reports & Reviews",
    desc: "Receive progress reports with highlights on strong and weak areas plus actionable recommendations.",
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

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 items-start">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="shrink-0 text-brand-gold-dark">{s.icon}</div>
              <div className="mt-6 h-0.5 bg-gradient-to-r from-ink-900/30 via-ink-900/10 to-transparent">
                <div className="h-0.5 w-9 bg-brand-gold" />
              </div>
              <div className="mt-5">
                <h3 className="text-lg font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{s.desc}</p>
              </div>
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
