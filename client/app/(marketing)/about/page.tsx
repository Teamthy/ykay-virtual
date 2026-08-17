import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, personJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import { GraduationCap, BookOpen, Eye, ShieldCheck, Check, Award, Briefcase, Sparkles } from "lucide-react";

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
};

const PILLARS = [
  {
    icon: GraduationCap,
    title: "Academically governed",
    body: "NUVORA controls tutor quality, programme standards and the learner experience. Every tutor is vetted, every programme follows a defined curriculum pathway.",
  },
  {
    icon: BookOpen,
    title: "Multi-curriculum",
    body: "British and Nigerian curriculum pathways in one platform — from Year 7 and JSS1 through IGCSE, WAEC, NECO, JAMB and A-Level preparation.",
  },
  {
    icon: Eye,
    title: "Parent visibility",
    body: "Attendance, progress, tutor feedback, schedules and payments — visible in one parent dashboard with object-level privacy controls.",
  },
  {
    icon: ShieldCheck,
    title: "Safeguarding by design",
    body: "Because the platform serves children, safeguarding is a product requirement: restricted messaging, governed lesson access and conservative handling of learner data.",
  },
];

const QUALITY = [
  "Staged tutor vetting: identity, documents, interview and competency assessment",
  "Curriculum-governed programmes with defined learning outcomes",
  "Lesson notes, attendance and homework after every session",
  "Weekly progress reports with strengths, weaknesses and recommendations",
  "Performance review: tutor ratings recomputed from consented published reviews",
];

const SAFEGUARDING = [
  "Minors are created and linked by parents or guardians — no self-registration under the threshold",
  "Learner contact details are never exposed to tutors unless business rules require it",
  "Messages are booking-scoped; direct contact between strangers is not possible",
  "Lesson access is governed; tutor documents live in a private bucket with signed URLs",
  "A clear reporting path for safeguarding concerns via our support team",
];

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
            <Check size={12} strokeWidth={3} />
          </span>
          <span className="text-sm leading-relaxed text-ink-700">{t}</span>
        </li>
      ))}
    </ul>
  );
}

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
        eyebrow="Who we are"
        title="A school without walls"
        subtitle="NUVORA is a digital education business — an online school rather than a simple tutor directory. We combine the standards of a strong school with the flexibility of online learning: programmes, cohorts, vetted tutors, assessments and progress you can actually see."
        crumbs={[{ name: "Home", href: "/" }, { name: "About" }]}
        align="center"
      />

      {/* Vision — brand primary green */}
      <section className="mt-14 rounded-3xl bg-[#70F250] p-10 text-center md:p-14">
        <h2 className="font-display text-2xl tracking-[0.02em] text-black md:text-3xl">Our vision</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-black/80">
          To make high-quality, accountable teaching accessible beyond geography — giving every learner
          access to structured, high-quality education wherever they are.
        </p>
      </section>

      {/* Pillars */}
      <section className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Why NUVORA</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">What makes NUVORA different</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-colors hover:border-brand-gold">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <p.icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-[0.02em] text-brand-navy">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="mt-16 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="sticky top-28 overflow-hidden rounded-3xl bg-brand-navy text-white shadow-card">
          <div className="aspect-[4/5] grid place-items-center p-8 text-center">
            <div>
              <div className="mx-auto grid size-24 place-items-center rounded-full bg-brand-gold font-display text-4xl text-ink-900">
                {FOUNDER.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <p className="mt-5 text-lg font-bold">{FOUNDER.name}</p>
              <p className="text-sm text-brand-gold">{FOUNDER.role}</p>
              <p className="mt-4 text-[11px] text-white/50">
                Portrait to be replaced with an approved professional photograph (consent-cleared).
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Academic leadership</p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">{FOUNDER.name}</h2>
          <p className="mt-1 font-semibold text-brand-green">{FOUNDER.role}</p>
          <p className="mt-4 leading-relaxed text-ink-700">{FOUNDER.summary}</p>

          <h3 className="mt-8 flex items-center gap-2 font-bold text-brand-navy">
            <Briefcase size={16} className="text-brand-green" /> Career
          </h3>
          <ul className="mt-3 space-y-1.5 pl-1 text-sm text-ink-700">
            {FOUNDER.career.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-brand-green">·</span>
                {c}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 flex items-center gap-2 font-bold text-brand-navy">
            <Award size={16} className="text-brand-green" /> Credentials
          </h3>
          <ul className="mt-3 space-y-1.5 pl-1 text-sm text-ink-700">
            {FOUNDER.credentials.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-brand-green">·</span>
                {c}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 flex items-center gap-2 font-bold text-brand-navy">
            <Sparkles size={16} className="text-brand-green" /> Selected achievements
          </h3>
          <ul className="mt-3 space-y-1.5 pl-1 text-sm text-ink-700">
            {FOUNDER.achievements.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-brand-green">·</span>
                {a}
              </li>
            ))}
          </ul>

        </div>
      </section>

      {/* Academic quality model + safeguarding */}
      <section className="mt-16 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Our academic quality model</h2>
          <CheckList items={QUALITY} />
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Safeguarding &amp; learner wellbeing</h2>
          <CheckList items={SAFEGUARDING} />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-3xl bg-brand-navy p-12 text-center text-white">
        <h2 className="font-display text-2xl tracking-[0.02em] md:text-3xl">Explore what NUVORA offers</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          British or Nigerian curriculum, exam preparation or digital skills — find the right
          programme for your learner.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
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
