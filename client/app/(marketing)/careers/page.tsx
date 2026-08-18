import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import {
  ShieldCheck,
  GraduationCap,
  Lock,
  Code2,
  Users,
  Briefcase,
  Check,
  Send,
} from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Careers â€” Join the team building NUVORA",
  description:
    "We're building Africa's trusted virtual school â€” engineering, academic operations and tutor success. See open roles and how we hire.",
  path: "/careers",
});

const VALUES = [
  {
    icon: ShieldCheck,
    title: "Safeguarding first",
    body: "We serve children, so safety is a product requirement â€” restricted messaging, governed lesson access and careful handling of learner data.",
  },
  {
    icon: GraduationCap,
    title: "Academic standards",
    body: "Every feature has to earn its place in a real learning journey: vetted tutors, curriculum-governed programmes and progress you can see.",
  },
  {
    icon: Lock,
    title: "Honest money",
    body: "Payments are escrow-protected and fail closed. Funds move only when they should â€” safety is built in, not bolted on.",
  },
  {
    icon: Code2,
    title: "Small team, real ownership",
    body: "We ship across the whole system â€” a Next.js client, a Go API, PostgreSQL and Redis â€” and everyone owns their work end to end.",
  },
];

const WORK = [
  "The web client: Next.js + TypeScript with TanStack Query, route groups and a branded design system",
  "The Go API: REST + OpenAPI contract, PostgreSQL, Redis caching and a background job worker",
  "Payments & bookings: escrow-safe tuition payments, cohorts and private lessons, tutor payouts",
  "Trust & safety: tutor vetting, safeguarding rules, role-based access and audit logging",
];

const ROLES = [
  {
    icon: Code2,
    title: "Full-Stack Engineer (Next.js + Go)",
    body: "Build across the web client and the Go API â€” dashboards, bookings, escrow payments and the tutor experience. Comfortable with TypeScript and Go, and you care about shipping working systems.",
    tags: ["Next.js", "Go", "PostgreSQL", "Redis"],
  },
  {
    icon: Users,
    title: "Academic Operations Lead",
    body: "Own programme quality and academic governance â€” tutor vetting and interviews, curriculum pathways, safeguarding and the learner experience. An educator who can run operations, not just teach.",
    tags: ["Vetting", "Safeguarding", "Programmes", "Quality"],
  },
];

const PROCESS = [
  { step: "01", title: "Apply", body: "Write to us with a short note and, for engineering roles, links to work you are proud of." },
  { step: "02", title: "Intro call", body: "A conversation about the role, the team and what you would like to build." },
  { step: "03", title: "Work sample", body: "A focused, take-home exercise or technical conversation â€” no all-day interviews." },
  { step: "04", title: "Meet the team & offer", body: "Meet the people you would work with, then a clear decision either way." },
];

export default function CareersPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Careers", item: "https://nuvora.com/careers" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      
      <PageHero
        eyebrow="Join the team"
        title="Build the school of the future"
        subtitle="NUVORA is a full commercial, SEO-first virtual school â€” not just a lead-gen site. We hire people who want to build real education infrastructure: engineering, academic operations and tutor success."
        crumbs={[{ name: "Home", href: "/" }, { name: "Careers" }]}
        align="center"
      />

      <div className="container-x py-12">

      {/* Mission */}
      <section className="mt-14 rounded-3xl bg-[#70F250] p-10 text-center md:p-14">
        <h2 className="font-display text-2xl tracking-[0.02em] text-black md:text-3xl">Why work with us</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-black/80">
          We are building a complete virtual school: programmes, cohorts, vetted tutors, assessments
          and progress parents can actually see. Every role here shapes that product directly.
        </p>
      </section>

      {/* Values */}
      <section className="mt-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">How we work</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">What we value</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-colors hover:border-brand-gold"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <v.icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-[0.02em] text-brand-navy">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you'll work on + hiring process */}
      <section className="mt-16 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">What you will work on</h2>
          <ul className="mt-4 space-y-3">
            {WORK.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-gold-light text-brand-green">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="text-sm leading-relaxed text-ink-700">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">Hiring process</h2>
          <ol className="mt-4 space-y-4">
            {PROCESS.map((p) => (
              <li key={p.step} className="flex gap-4">
                <span className="font-display text-xl text-brand-gold">{p.step}</span>
                <div>
                  <p className="font-bold text-brand-navy">{p.title}</p>
                  <p className="text-sm leading-relaxed text-ink-600">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Open roles */}
      <section className="mt-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">Open roles</p>
        <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">Join the team</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-soft transition-colors hover:border-brand-gold"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <r.icon size={20} />
              </span>
              <h3 className="mt-4 font-display text-lg tracking-[0.02em] text-brand-navy">{r.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{r.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.tags.map((t) => (
                  <span key={t} className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
                    {t}
                  </span>
                ))}
              </div>
              <a
                href={`mailto:support@nuvora.com?subject=${encodeURIComponent(`Application â€” ${r.title}`)}`}
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover"
              >
                Apply <Send size={14} />
              </a>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5">
          <Briefcase className="mt-0.5 size-5 shrink-0 text-brand-green" />
          <p className="text-sm leading-relaxed text-ink-700">
            <span className="font-bold text-brand-navy">Don&apos;t see your role?</span> We review speculative
            applications from strong people. Write to{" "}
            <a
              href="mailto:support@nuvora.com?subject=Careers%20%E2%80%94%20speculative%20application"
              className="font-semibold text-brand-blue hover:underline"
            >
              support@nuvora.com
            </a>{" "}
            with a short note about what you would like to build.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 rounded-3xl bg-brand-navy p-12 text-center text-white">
        <h2 className="font-display text-2xl tracking-[0.02em] text-white md:text-3xl">Build with us</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          Tell us what you would bring to NUVORA. We read every application.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href="mailto:support@nuvora.com?subject=Careers%20application"
            className="rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
          >
            Apply now
          </a>
          <Link
            href="/about"
            className="rounded-full border border-white/40 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            Learn about us
          </Link>
        </div>
      </section>
    
      </div>
    </main>
  );
}
