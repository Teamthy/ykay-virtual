import type { Metadata } from "next";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "About — Academic Leadership, Standards & Safeguarding | YKAY",
  description:
    "YKAY Virtual School combines excellent teachers, strong academic systems and technology to give learners structured, high-quality education anywhere. Meet our academic leader.",
  path: "/about",
});

const FOUNDER = {
  name: "Yinka Oladimeji",
  role: "Founder & Academic Leader",
  summary:
    "Yinka Oladimeji is an experienced educator, Computing leader and information technology professional with a career spanning leading international schools in Nigeria.",
  career: [
    "Atlantic Hall Educational Trust Council",
    "Day Waterman College",
    "Children's International School, Lekki — leading the Computing Department",
  ],
  credentials: ["BSc Computer Science", "MSc Information Technology", "Fellow, COBIS Middle Leaders programme"],
  achievements: [
    "Prepared learners for British curriculum examinations including IGCSE Computer Science, with students achieving exceptional national outcomes.",
    "Led students in international technology competitions, including the 2026 International Coding Olympiad in Rome, Italy — his delegation won medals and a Nigerian student achieved a world Top-3 result in the Codementum category.",
  ],
  vision:
    "Yinka's vision for YKAY Virtual School is to combine excellent teachers, strong academic systems and technology to give learners access to structured, high-quality education wherever they are.",};

const PILLARS = [
  {
    title: "Academically governed",
    body: "YKAY controls tutor quality, programme standards and the learner experience. Every tutor is vetted, every programme follows a defined curriculum pathway.",
  },
  {
    title: "Multi-curriculum",
    body: "British and Nigerian curriculum pathways in one platform — from Year 7 and JSS1 through IGCSE, WAEC, NECO, JAMB and A-Level preparation.",
  },
  {
    title: "Parent visibility",
    body: "Attendance, progress, tutor feedback, schedules and payments — visible in one parent dashboard with object-level privacy controls.",
  },
  {
    title: "Safeguarding by design",
    body: "Because the platform serves children, safeguarding is a product requirement: restricted messaging, governed lesson access and conservative handling of learner data.",
  },
];

export default function AboutPage() {
  const person = personJsonLd({
    name: FOUNDER.name,
    description: FOUNDER.summary,
    url: "https://ykayvirtual.com/about",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "About", item: "https://ykayvirtual.com/about" },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <p className="tag-handwritten">Who we are</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mt-2">
          Expert teaching. Structured learning. Anywhere.
        </h1>
        <p className="mt-4 text-ink-600 leading-relaxed">
          YKAY Virtual School is a digital education business — an online school rather than a simple
          tutor directory. We combine the standards of a strong school with the flexibility of online
          learning: programmes, cohorts, vetted tutors, assessments and progress you can actually see.
        </p>
      </section>

      {/* Vision */}
      <section className="mt-14 rounded-3xl bg-brand-blue text-white p-10 md:p-14 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold">Our vision</h2>
        <p className="mt-4 max-w-2xl mx-auto leading-relaxed text-white/90">
          To make high-quality, accountable teaching accessible beyond geography — giving every learner
          access to structured, high-quality education wherever they are.
        </p>
      </section>

      {/* Pillars */}
      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">What makes YKAY different</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {PILLARS.map((p) => (
            <div key={p.title} className="border rounded-2xl p-6 hover:border-brand-blue/40 transition-colors">
              <h3 className="font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="mt-14 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
        <div className="rounded-3xl border overflow-hidden sticky lg:top-28">
          <div className="bg-gradient-to-br from-brand-blue to-blue-800 aspect-[4/5] grid place-items-center">
            <div className="text-center text-white px-8">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
              <p className="mt-4 text-lg font-bold">{FOUNDER.name}</p>
              <p className="text-sm text-white/70">{FOUNDER.role}</p>
              <p className="mt-4 text-[11px] text-white/50">
                Portrait to be replaced with an approved professional photograph (consent-cleared).
              </p>
            </div>
          </div>
        </div>
        <div>
          <p className="tag-handwritten">Academic leadership</p>
          <h2 className="text-3xl font-extrabold mt-1">{FOUNDER.name}</h2>
          <p className="text-brand-blue font-semibold mt-1">{FOUNDER.role}</p>
          <p className="mt-4 text-ink-700 leading-relaxed">{FOUNDER.summary}</p>

          <h3 className="font-bold mt-6">Career</h3>
          <ul className="mt-2 space-y-1.5 list-disc pl-5 text-sm text-ink-700">
            {FOUNDER.career.map((c) => <li key={c}>{c}</li>)}
          </ul>

          <h3 className="font-bold mt-6">Credentials</h3>
          <ul className="mt-2 space-y-1.5 list-disc pl-5 text-sm text-ink-700">
            {FOUNDER.credentials.map((c) => <li key={c}>{c}</li>)}
          </ul>

          <h3 className="font-bold mt-6">Selected achievements</h3>
          <ul className="mt-2 space-y-1.5 list-disc pl-5 text-sm text-ink-700">
            {FOUNDER.achievements.map((a) => <li key={a}>{a}</li>)}
          </ul>

          <p className="mt-6 rounded-2xl bg-ink-50 p-5 text-sm text-ink-700 leading-relaxed border border-ink-100">
            {FOUNDER.vision}
          </p>

        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 text-center border rounded-3xl p-12">
        <h2 className="text-2xl font-extrabold">Explore what YKAY offers</h2>
        <p className="mt-2 text-ink-600 text-sm max-w-xl mx-auto">
          British or Nigerian curriculum, exam preparation or digital skills — find the right
          programme for your learner.
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/programmes" className="btn-primary">Find a programme</Link>
          <Link href="/private-tuition" className="btn-gold">Book private tuition</Link>
        </div>
      </section>
    </main>
  );
}
