import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import { GraduationCap, BookOpen, Eye, ShieldCheck, Check, Award, Briefcase } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "About — Academic Leadership, Standards & Safeguarding | NUVORA",
  description:
    "NUVORA combines excellent teachers, strong academic systems and technology to give learners structured, high-quality education anywhere. Meet our academic leader.",
  path: "/about",
});

const FOUNDER = {
  name: "Yinka Oladimeji",
  role: "Founder & Academic Leader",
  summary:
    "Experienced educator, Computing leader and IT professional — a career spanning leading international schools in Nigeria.",
  career: [
    "Atlantic Hall Educational Trust Council",
    "Day Waterman College",
    "Children's International School, Lekki — Head of Computing",
  ],
  credentials: ["BSc Computer Science", "MSc Information Technology", "Fellow, COBIS Middle Leaders"],
  achievements: [
    "Prepared learners for IGCSE Computer Science with exceptional national outcomes.",
    "Led a delegation at the 2026 International Coding Olympiad (Rome) — medals, and a Nigerian student world Top-3 in Codementum.",
  ],
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Academically governed",
    body: "Every tutor is vetted and every programme follows a defined curriculum pathway.",
  },
  {
    icon: BookOpen,
    title: "Multi-curriculum",
    body: "British and Nigerian pathways in one platform — Year 7 to IGCSE, WAEC, NECO, JAMB and A-Level.",
  },
  {
    icon: Eye,
    title: "Parent visibility",
    body: "Attendance, progress, feedback and payments — one parent dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Safeguarding by design",
    body: "Restricted messaging, governed lesson access and careful handling of learner data.",
  },
];

const QUALITY = [
  "Staged vetting: identity, documents, interview, competency assessment",
  "Curriculum-governed programmes with defined outcomes",
  "Lesson notes, attendance and homework after every session",
  "Weekly progress reports with strengths and recommendations",
];

const SAFEGUARDING = [
  "Minors are created and linked by parents or guardians",
  "Learner contact details are never exposed to tutors unnecessarily",
  "Messaging is booking-scoped — no direct contact between strangers",
  "A clear reporting path for safeguarding concerns",
];

export default function AboutPage() {
  const person = personJsonLd({
    name: FOUNDER.name,
    description: FOUNDER.summary,
    url: "https://nuvora.com/about",
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "About", item: "https://nuvora.com/about" },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(person) }} />

      <PageHero
        cover="/hero/about.jpg"
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="An online school, not a tutor directory — programmes, cohorts and vetted tutors with progress you can actually see."
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        align="center"
      />

      {/* Vision */}
      <section className="mt-12 rounded-3xl bg-[#70F250] px-8 py-10 text-center md:px-14">
        <h2 className="font-display text-2xl tracking-[0.02em] text-black md:text-3xl">Our vision</h2>
        <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-black/80">
          High-quality, accountable teaching beyond geography — for every learner, wherever they are.
        </p>
      </section>

      {/* Pillars */}
      <section className="mt-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Why NUVORA</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">What makes us different</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-colors hover:border-brand-gold">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <p.icon size={20} />
              </span>
              <div>
                <h3 className="font-display text-lg tracking-[0.02em] text-brand-navy">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Founder — compact card */}
      <section className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft">
        <div className="grid items-stretch lg:grid-cols-[0.85fr_1.15fr]">
          <div className="flex flex-col items-center justify-center gap-3 bg-brand-navy p-8 text-center text-white">
            <div className="grid size-20 place-items-center rounded-full bg-brand-gold font-display text-3xl text-ink-900">
              {FOUNDER.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="text-lg font-bold">{FOUNDER.name}</p>
              <p className="text-sm text-brand-gold">{FOUNDER.role}</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Academic leadership</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">{FOUNDER.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Briefcase size={14} className="text-brand-green" />
              {FOUNDER.career.map((c) => (
                <span key={c} className="rounded-full bg-ink-50 px-3 py-1.5 text-xs font-semibold text-ink-700">
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Award size={14} className="text-brand-green" />
              {FOUNDER.credentials.map((c) => (
                <span key={c} className="rounded-full bg-brand-gold-light px-3 py-1.5 text-xs font-semibold text-brand-navy">
                  {c}
                </span>
              ))}
            </div>

            <ul className="mt-5 space-y-2">
              {FOUNDER.achievements.map((a) => (
                <li key={a} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <Check size={15} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-green" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Quality + safeguarding */}
      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {[
          { title: "Our academic quality model", items: QUALITY },
          { title: "Safeguarding & learner wellbeing", items: SAFEGUARDING },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">{s.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {s.items.map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-700">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-3xl bg-brand-navy p-10 text-center text-white md:p-12">
        <h2 className="font-display text-2xl tracking-[0.02em] md:text-3xl">Explore what NUVORA offers</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          British or Nigerian curriculum, exam preparation or digital skills.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/programmes" className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5">
            Find a programme
          </Link>
          <Link href="/private-tuition" className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
            Book private tuition
          </Link>
        </div>
      </section>
    </main>
  );
}
