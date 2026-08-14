import Image from "next/image";
import { Play } from "lucide-react";

// v2.tuteria.com "Learn how it works" video section: split layout with a
// video thumbnail + play CTA and the three how-it-works steps.

const STEPS = [
  {
    n: "1",
    t: "Tell us what your child needs",
    d: "Choose a subject, level and schedule — or let our advisors recommend the right programme.",
  },
  {
    n: "2",
    t: "Get matched with a vetted tutor",
    d: "We match you with a top-1% tutor, agree a plan and start lessons at home or online.",
  },
  {
    n: "3",
    t: "Watch progress in real time",
    d: "Attendance, lesson notes, homework and progress reports — visible to you at every step.",
  },
];

export function HowItWorksVideo() {
  return (
    <section className="border-t border-ink-100 bg-surface-muted py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
        {/* Video */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">Learn how it works</p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
            How NUVORA works
          </h2>
          <p className="mt-3 text-ink-600 leading-relaxed">
            Watch how families across Nigeria use NUVORA to find vetted tutors, book lessons
            and track progress — in under two minutes.
          </p>

          <a
            href="https://www.youtube.com/results?search_query=online+tutoring+nigeria"
            target="_blank"
            rel="noreferrer"
            className="group relative mt-6 block overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-100"
            aria-label="Watch how NUVORA works"
          >
            <Image
              src="/hero/international.jpg"
              alt="Students learning together on NUVORA"
              width={1040}
              height={585}
              className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <span className="absolute inset-0 bg-brand-navy/35 transition-colors group-hover:bg-brand-navy/25" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-white/95 text-brand-navy shadow-lift transition-transform group-hover:scale-110">
                <Play size={30} className="ml-1" fill="currentColor" />
              </span>
            </span>
          </a>
        </div>

        {/* Steps */}
        <div className="space-y-5">
          {STEPS.map((s) => (
            <div key={s.n} className="flex items-start gap-5 rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-navy font-display text-xl text-white">
                {s.n}
              </span>
              <div>
                <h3 className="font-bold text-ink-800">{s.t}</h3>
                <p className="mt-1 text-sm text-ink-500 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
