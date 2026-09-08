import Link from "next/link";

import { AnimatedText } from "@/components/ui/animated-text";
const STEPS = [
  { n: "1", title: "Choose", body: "Programmes, cohorts or a vetted tutor." },
  {
    n: "2",
    title: "Enrol / Book",
    body: "Secure with escrow-protected payment.",
  },
  { n: "3", title: "Learn", body: "Live lessons, resources, assignments." },
  { n: "4", title: "Track", body: "Progress reports for parents." },
];

export function HowItWorksStrip() {
  return (
    <section className="backdrop-brand-light w-full bg-peach py-16 md:py-20">
      <div className="container-x">
      <div className="text-center">
        <p className="tag-handwritten">How it works</p>
        <AnimatedText
          as="h2"
          className="mt-1 text-3xl font-extrabold text-deep-green"
          text="Four steps to better learning"
        />
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl border border-ink-200 bg-white p-6 text-center text-deep-green">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-deep-green font-extrabold text-primary">
              {s.n}
            </div>
            <h3 className="mt-3 font-bold text-deep-green">{s.title}</h3>
            <p className="mt-1 text-sm text-ink-600">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          href="/how-it-works"
          className="text-sm font-semibold text-deep-green hover:underline"
        >
          See the full walkthrough for parents & tutors →
        </Link>
      </div>
          </div>
    </section>
  );
}
