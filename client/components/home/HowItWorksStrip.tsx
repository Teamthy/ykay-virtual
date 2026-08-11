import Link from "next/link";

const STEPS = [
  { n: "1", title: "Choose", body: "Programmes, cohorts or a vetted tutor." },
  { n: "2", title: "Enrol / Book", body: "Secure with escrow-protected payment." },
  { n: "3", title: "Learn", body: "Live lessons, resources, assignments." },
  { n: "4", title: "Track", body: "Progress reports for parents." },
];

export function HowItWorksStrip() {
  return (
    <section className="container-x py-16">
      <div className="text-center">
        <p className="tag-handwritten">How it works</p>
        <h2 className="text-3xl font-extrabold mt-1">Four steps to better learning</h2>
      </div>
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((s) => (
          <div key={s.n} className="text-center border rounded-2xl p-6">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white font-extrabold">
              {s.n}
            </div>
            <h3 className="font-bold mt-3">{s.title}</h3>
            <p className="mt-1 text-sm text-ink-600">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/how-it-works" className="text-sm font-semibold text-brand-blue hover:underline">
          See the full walkthrough for parents & tutors →
        </Link>
      </div>
    </section>
  );
}
