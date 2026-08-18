import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import { GraduationCap, BookOpen, Eye, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "About — Academic Leadership & Standards | NUVORA",
  description:
    "NUVORA is an online school: vetted tutors, governed curricula and visible progress. Meet our founder.",
  path: "/about",
});

const FOUNDER = {
  name: "Yinka Oladimeji",
  role: "Founder & Academic Leader",
  summary:
    "Educator, Computing leader and IT professional with a career spanning leading international schools in Nigeria.",
  career: [
    "Atlantic Hall Educational Trust Council",
    "Day Waterman College",
    "Children's International School, Lekki — Head of Computing",
  ],
  credentials: ["BSc Computer Science", "MSc Information Technology", "Fellow, COBIS Middle Leaders"],
  highlights: [
    "IGCSE Computer Science learners with exceptional national outcomes.",
    "Led a delegation at the 2026 International Coding Olympiad (Rome) — medals and a Nigerian student world Top-3 in Codementum.",
  ],
};

const PILLARS = [
  { icon: GraduationCap, title: "Academically governed", body: "Every tutor vetted; every programme follows a defined curriculum." },
  { icon: BookOpen, title: "Multi-curriculum", body: "British and Nigerian pathways in one platform." },
  { icon: Eye, title: "Parent visibility", body: "Attendance, progress and payments in one dashboard." },
  { icon: ShieldCheck, title: "Safeguarding by design", body: "Restricted messaging and careful handling of learner data." },
];

export default function AboutPage() {
  const person = personJsonLd({ name: FOUNDER.name, description: FOUNDER.summary, url: "https://nuvora.com/about" });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "About", item: "https://nuvora.com/about" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      <PageHero
        cover="/hero/about.jpg"
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="An online school, not a tutor directory — vetted tutors, governed curricula and progress you can see."
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        align="center"
      />

      <div className="container-x py-12">
        {/* Vision — one line */}
        <section className="rounded-3xl bg-brand-navy px-8 py-10 text-center text-white md:px-14">
          <h2 className="font-display text-2xl tracking-[0.02em] text-white md:text-3xl">Our vision</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
            High-quality, accountable teaching beyond geography — for every learner, wherever they are.
          </p>
        </section>

        {/* Pillars */}
        <section className="mt-10">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy">What makes us different</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                  <p.icon size={20} />
                </span>
                <h3 className="font-display text-base tracking-[0.02em] text-brand-navy">{p.title}</h3>
                <p className="text-sm leading-relaxed text-ink-600">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Founder */}
        <section className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[320px] lg:min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/founder/ade-yinka-portrait.jpg"
                alt={`${FOUNDER.name}, ${FOUNDER.role}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Academic leadership</p>
              <h2 className="mt-2 font-display text-2xl tracking-[0.02em] text-brand-navy">{FOUNDER.name}</h2>
              <p className="text-sm font-semibold text-ink-500">{FOUNDER.role}</p>

              <p className="mt-4 text-sm leading-relaxed text-ink-700">{FOUNDER.summary}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {FOUNDER.credentials.map((c) => (
                  <span key={c} className="rounded-full bg-brand-gold-light px-3 py-1.5 text-xs font-semibold text-brand-navy">
                    {c}
                  </span>
                ))}
              </div>

              <ul className="mt-5 space-y-2">
                {FOUNDER.highlights.map((a) => (
                  <li key={a} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-green" />
                    {a}
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-2">
                {FOUNDER.career.map((c) => (
                  <span key={c} className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-3xl bg-brand-gold p-10 text-center md:p-12">
          <h2 className="font-display text-2xl tracking-[0.02em] text-ink-900 md:text-3xl">Start learning with NUVORA</h2>
          <Link
            href="/programmes"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-bold text-white transition hover:bg-brand-navy-dark"
          >
            Explore programmes <ArrowRight size={16} />
          </Link>
        </section>
      </div>
    </main>
  );
}
