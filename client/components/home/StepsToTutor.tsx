import { cn } from "@/lib/utils";

import { AnimatedText } from "@/components/ui/animated-text";
// 3-step "Get a tutor" band (reference 003216) - place a request → meet your
// tutor → study & succeed. Props-driven so each product page customises copy.

export type Step = { n: string; title: string; desc: string };

export function StepsToTutor({
  eyebrow = "Get a tutor in 3 simple steps",
  title,
  steps,
  className,
}: {
  eyebrow?: string;
  title?: string;
  steps: Step[];
  className?: string;
}) {
  return (
    <section className={cn("py-16 bg-white", className)}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {title && (
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-brand-navy text-center">
            <AnimatedText text={title} delay={0.0} />
          </h2>
        )}
        {!title && (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark text-center">
            {eyebrow}
          </p>
        )}
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-ink-100 bg-surface-muted p-7"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gold text-sm text-ink-900 font-extrabold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-bold text-brand-navy">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
