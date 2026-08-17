import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { UtmeCallbackForm } from "@/features/programmes/components/UtmeCallbackForm";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Check, BrainCircuit, FileCheck2, CalendarCheck2, LifeBuoy, Trophy } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 prep — live class, mocks, reports | NUVORA",
  description:
    "JAMB/UTME prep on nuvora.com: live lessons, recordings, timed mocks and parent notes. Same login on mobile. No 320+ guarantee.",
  path: "/utme-2026",
});

const INCLUDED = [
  {
    icon: <CalendarCheck2 size={20} />,
    title: "Live, Expert-Led Classes",
    desc: "Master the entire UTME syllabus in 100+ interactive live online lessons — watch or re-watch anytime, anywhere.",
  },
  {
    icon: <FileCheck2 size={20} />,
    title: "Practice Exams & AI Drills",
    desc: "Master every topic with over 200 topic-based practice exams that builds exam stamina.",
  },
  {
    icon: <BrainCircuit size={20} />,
    title: "Weekly Live CBT Mock Exams",
    desc: "Simulate the real UTME with full-length timed exams every Saturday — boosting speed and confidence.",
  },
  {
    icon: <LifeBuoy size={20} />,
    title: "Remedial Classes & Peer Support",
    desc: "Get instant help from tutors and peers to ensure you never get stuck, but always keep learning.",
  },
];

const PRIZES = [
  { n: "1", text: "Prize places are listed only when a round is funded" },
  { n: "★", text: "Weekly recognition for effort — not a published cash pool" },
];

const PACKAGES = [
  {
    name: "UTME Mastery",
    price: "₦35,000",
    tag: "Indicative · confirm before pay",
    featured: false,
    features: [
      "Live classes + recordings you can rewatch on your phone",
      "Topic drills from past-paper patterns",
      "Weekly timed CBT-style mocks",
      "Weekly report for parents",
    ],
  },
  {
    name: "UTME Plus",
    price: "₦52,500",
    tag: "Indicative · confirm before pay",
    featured: true,
    features: [
      "Everything in Mastery",
      "Remedial office hours",
      "Smaller group + named mentor",
      "Priority advisor replies",
    ],
  },
];

export default function Utme2026Page() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "UTME 2026 Prep", item: "https://nuvora.com/utme-2026" },
  ]);
  const course = courseJsonLd({
    name: "NUVORA JAMB 2026 Preparation Programme",
    description:
      "UTME prep on nuvora.com: live lessons, recordings, timed mocks and parent notes. No score guarantee.",
    provider: "NUVORA",
    url: "https://nuvora.com/utme-2026",
  });

  return (
    <main className="bg-[#FFF7E4]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      {/* ── Prep hero (Preline-style): gradient + blockquote + form card ── */}
      <section className="relative bg-gradient-to-bl from-[#F3E8FF] via-transparent to-[#FFF7E4]">
        <div className="mx-auto max-w-[1400px] px-6 py-10 sm:px-6 md:px-10 lg:py-14">
          <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-12">
            <div>
              <p className="inline-block bg-clip-text bg-gradient-to-l from-[#013920] to-[#4CCB31] text-sm font-semibold uppercase tracking-[0.14em] text-transparent">
                Online Prep · Jan – Apr 2026
              </p>

              <div className="mt-4 max-w-2xl md:mb-8">
                <h1 className="mb-4 font-display text-4xl leading-tight tracking-[0.02em] text-[#013920] lg:text-6xl">
                  JAMB 2026 SUCCESS
                </h1>
                <p className="text-lg text-ink-700">
                  Get Into Your Dream School with Nigeria&apos;s Most Advanced UTME Prep that{" "}
                  <span className="font-bold text-[#4CCB31]">helps you sit the exam prepared</span>.
                </p>
              </div>

              <blockquote className="relative hidden max-w-sm md:block">
                <svg className="absolute -left-6 -top-8 size-16 text-[#013920]/10" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M7.39762 10.3C7.39762 11.0733 7.14888 11.7 6.6514 12.18C6.15392 12.6333 5.52552 12.86 4.76621 12.86C3.84979 12.86 3.09047 12.5533 2.48825 11.94C1.91222 11.3266 1.62421 10.4467 1.62421 9.29999C1.62421 8.07332 1.96459 6.87332 2.64535 5.69999C3.35231 4.49999 4.33418 3.55332 5.59098 2.85999L6.4943 4.25999C5.81354 4.73999 5.26369 5.27332 4.84476 5.85999C4.45201 6.44666 4.19017 7.12666 4.05926 7.89999C4.29491 7.79332 4.56983 7.73999 4.88403 7.73999C5.61716 7.73999 6.21938 7.97999 6.69067 8.45999C7.16197 8.93999 7.39762 9.55333 7.39762 10.3ZM14.6242 10.3C14.6242 11.0733 14.3755 11.7 13.878 12.18C13.3805 12.6333 12.7521 12.86 11.9928 12.86C11.0764 12.86 10.3171 12.5533 9.71484 11.94C9.13881 11.3266 8.85079 10.4467 8.85079 9.29999C8.85079 8.07332 9.19117 6.87332 9.87194 5.69999C10.5789 4.49999 11.5608 3.55332 12.8176 2.85999L13.7209 4.25999C13.0401 4.73999 12.4903 5.27332 12.0713 5.85999C11.6786 6.44666 11.4168 7.12666 11.2858 7.89999C11.5215 7.79332 11.7964 7.73999 12.1106 7.73999C12.8437 7.73999 13.446 7.97999 13.9173 8.45999C14.3886 8.93999 14.6242 9.55333 14.6242 10.3Z" />
                </svg>
                <div className="relative z-10">
                  <p className="text-xl italic text-[#013920]">
                    &ldquo;Preparing for UTME a second time was tough emotionally. The structured prep,
                    daily practice, and constant support helped me believe in myself — I didn&apos;t just
                    pass, I soared.&rdquo;
                  </p>
                </div>
                <footer className="mt-3 flex items-center gap-x-4">
                  <div className="shrink-0 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#013920] to-[#0A4D32] font-display text-white text-sm">
                    O
                  </div>
                  <div>
                    <div className="font-semibold text-[#013920]">Omoloja Olumuyiwa Eghosa</div>
                    <div className="text-xs text-ink-500">Parent note — attributed story, not a published average</div>
                  </div>
                </footer>
              </blockquote>
            </div>

            <div className="lg:mx-auto lg:me-0 ms-auto w-full lg:max-w-lg">
              <UtmeCallbackForm />
            </div>
          </div>

          {/* Clients strip */}
          <div className="mt-10 flex flex-wrap items-center gap-x-1.5 py-3 text-sm text-[#013920] after:flex-1 after:border-t after:border-ink-200 after:ms-6 md:mt-14">
            <span className="font-semibold">Join this year's cohort</span>
            preparing for JAMB 2026
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:gap-x-10">
            {["Science", "Arts", "Commercial", "Diagnostic Tests", "Weekly Prizes", "Weekly Mock Exams"].map((c) => (
              <span key={c} className="py-2 text-sm font-semibold text-ink-400">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold-dark">On nuvora.com — including your phone</p>
          <h2 className="mt-2 font-display text-3xl text-brand-navy">What this prep includes</h2>
          <p className="mt-2 max-w-2xl text-ink-600">
            One login. Open this site on mobile for live class, recordings and reports — not a separate prep domain.
          </p>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              "Past-question patterns used to plan the syllabus (we do not claim a secret 15-year AI score)",
              "Live lessons plus recordings you can rewatch on your phone",
              "Weekly timed CBT-style mocks",
              "Remedial office hours and a moderated peer space (not a WhatsApp dump)",
              "Weekly progress notes to parents",
            ].map((f) => (
              <li key={f} className="flex gap-3 rounded-2xl border border-ink-100 bg-surface-muted p-5 text-sm text-ink-700">
                <Check size={16} className="mt-0.5 shrink-0 text-brand-green" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SuccessChampions />

      {/* ── AI-powered prep ── */}
      <section className="bg-[#013920] py-16 text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl tracking-[0.02em] md:text-4xl">
              Ace your UTME with our AI-powered exam prep
            </h2>
            <p className="mt-4 leading-relaxed text-white/80">
              Tutors plan from{" "}
              <b className="text-[#4CCB31]">past-paper patterns</b> — we do not claim a secret
              15-year AI score or a predicted paper.
            </p>
            <p className="mt-3 leading-relaxed text-white/80">
              Live class, recordings and timed mocks. We do not guarantee 280+ or a university offer.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Mathematics", "Physics", "Use of English", "Biology", "Chemistry"].map((s) => (
                <span key={s} className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {INCLUDED.map((i) => (
              <div key={i.title} className="flex items-start gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#4CCB31] text-white">
                  {i.icon}
                </span>
                <div>
                  <h3 className="font-bold">{i.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{i.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scholarships ── */}
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF8E6] px-4 py-1.5 text-xs font-bold text-[#C9A227]">
              <Trophy size={13} /> Scholarship pool
            </div>
            <h2 className="mt-4 font-display text-3xl tracking-[0.02em] text-[#013920] md:text-4xl">
              Prizes for top performers (when a prize round is funded)
            </h2>
            <p className="mt-3 text-ink-600">
              Every student in the programme competes for scholarships and weekly prizes.
            </p>
          </div>
          <ul className="space-y-3">
            {PRIZES.map((p) => (
              <li key={p.n} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4CCB31] font-display text-lg text-white">
                  {p.n}
                </span>
                <span className="text-sm font-semibold text-ink-800">{p.text}</span>
              </li>
            ))}
            <li className="text-xs text-ink-400">Terms and Conditions Apply</li>
          </ul>
        </div>
      </section>

      {/* ── Packages ── */}
      <section id="packages" className="scroll-mt-24 bg-[#FFF7E4] pb-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-[0.02em] text-[#013920] md:text-4xl">
              Choose your package
            </h2>
            <div className="mt-3 flex justify-center gap-4 text-sm font-bold">
              <Link href="/utme-2026/pricing" className="text-[#4CCB31] hover:underline">Pricing details →</Link>
              <Link href="/utme-2026/faq" className="text-ink-600 hover:text-[#013920] hover:underline">FAQ</Link>
            </div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "relative rounded-3xl border-2 border-[#4CCB31] bg-white p-8 shadow-card"
                    : "relative rounded-3xl border border-ink-100 bg-white p-8 shadow-soft"
                }
              >
                {p.featured && (
                  <span className="absolute -top-3 right-6 rounded-full bg-[#4CCB31] px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl tracking-[0.02em] text-[#013920]">{p.name}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#4CCB31]">{p.tag}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-display text-4xl tracking-[0.02em] text-[#013920]">{p.price}</span>
                  <span className="text-sm font-semibold text-ink-500">indicative</span>
                </div>
                <p className="mt-1 text-xs text-ink-500">Comprehensive online UTME Prep for exam success</p>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                      <Check size={15} className="mt-0.5 shrink-0 text-[#009A49]" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="#callback"
                  className={
                    p.featured
                      ? "mt-8 block rounded-xl bg-[#4CCB31] px-8 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#5FE63F]"
                      : "mt-8 block rounded-xl bg-[#013920] px-8 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#0A4D32]"
                  }
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
