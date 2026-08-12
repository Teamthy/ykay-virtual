import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { UtmeCallbackForm } from "@/features/programmes/components/UtmeCallbackForm";
import { SuccessChampions } from "@/components/home/SuccessChampions";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Check, BrainCircuit, FileCheck2, CalendarCheck2, LifeBuoy, Trophy } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "JAMB 2026 Success — UTME Prep That Guarantees 320+ | NUVORA",
  description:
    "Nigeria's most advanced UTME prep: AI-analyzed curriculum from 20,000+ past questions, 200+ practice exams, weekly mock CBT, ₦20M scholarship pool. Join 10,000+ students.",
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
    desc: "Master every topic with over 200 topic-based practice exams that puts you ahead of 95% of UTME candidates.",
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
  { n: "1", text: "₦2,000,000 + Laptop to the top UTME scorer" },
  { n: "2", text: "₦1,000,000 + Laptop to the 2nd highest scorer" },
  { n: "3", text: "₦500,000 + Laptop to the 3rd highest scorer" },
  { n: "4-10", text: "Laptops to the 4th to 10th highest scorers" },
  { n: "★", text: "Weekly Prizes for top performing students" },
];

const PACKAGES = [
  {
    name: "UTME Mastery Plan",
    old: "₦50,000",
    price: "₦35,000",
    tag: "30% discount ends soon",
    featured: false,
    features: [
      "4 months of Intensive Live Classes from January to April",
      "Installment Payment available",
      "All Classes Recorded, Re-watch Anytime",
      "200+ Rigorous Topic-Based Practice Exams",
      "10+ Full-length Simulated CBT Mock Exams",
      "First-Class Teachers & UTME Experts",
      "Weekly Report on Student Performance",
    ],
  },
  {
    name: "UTME Plus Plan",
    old: "₦75,000",
    price: "₦52,500",
    tag: "30% discount ends soon",
    featured: true,
    features: [
      "Everything in Mastery, plus:",
      "Remedial classes for those who need extra help",
      "Small-group attention with dedicated mentor",
      "Priority scholarship eligibility",
      "Parent progress dashboard access",
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
      "Nigeria's most advanced UTME prep that guarantees a 320+ score — AI curriculum, 200+ practice exams, weekly mocks, ₦20M scholarships.",
    provider: "NUVORA",
    url: "https://nuvora.com/utme-2026",
  });

  return (
    <main className="bg-[#FFF8F2]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />

      {/* ── Prep hero: deep purple + orange (tuteriaprep) ── */}
      <section className="relative overflow-hidden bg-[#0A033C] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#FF6636]/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#7C3AED]/20 blur-3xl" aria-hidden="true" />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-[#FF6636] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
            Online Prep · Jan – Apr 2026
          </p>

          <h1 className="mt-6 font-display text-5xl leading-[1.02] tracking-[0.02em] md:text-7xl">
            JAMB 2026 SUCCESS
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80">
            Get Into Your Dream School with Nigeria&apos;s Most Advanced UTME Prep that{" "}
            <span className="font-bold text-[#FF6636]">Guarantees 320+ Score</span>.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {["Science", "Arts", "Commercial", "Diagnostic Tests", "Weekly Prizes", "Weekly Mock Exams"].map((c) => (
              <span key={c} className="rounded-full border border-white/25 bg-white/5 px-4 py-1.5 text-xs font-bold text-white/85">
                {c}
              </span>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-5">
            <a
              href="#packages"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6636] px-9 py-4 text-sm font-bold text-white transition-colors hover:bg-[#FF7A4D]"
            >
              Start My UTME Prep
            </a>
            <p className="text-sm text-white/70">Join 10,000+ students preparing for JAMB 2026</p>
          </div>
        </div>
      </section>

      {/* ── Phone capture ── */}
      <section id="callback" className="scroll-mt-24 py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl tracking-[0.02em] text-[#0A033C] md:text-4xl">
              Start Your JAMB Prep
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Leave your phone number — we&apos;ll text on SMS and WhatsApp to confirm, then our
              advisors walk you through enrolment. Free diagnostic test included.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-600">
              <li className="flex items-center gap-2.5"><Check size={15} className="text-[#009A49]" /> Free diagnostic test</li>
              <li className="flex items-center gap-2.5"><Check size={15} className="text-[#009A49]" /> Join 10k+ students</li>
              <li className="flex items-center gap-2.5"><Check size={15} className="text-[#009A49]" /> Scholarship pool eligibility</li>
            </ul>
          </div>
          <UtmeCallbackForm />
        </div>
      </section>

      <SuccessChampions />

      {/* ── AI-powered prep ── */}
      <section className="bg-[#0A033C] py-16 text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl tracking-[0.02em] md:text-4xl">
              Ace your UTME with our AI-powered exam prep
            </h2>
            <p className="mt-4 leading-relaxed text-white/80">
              We&apos;ve cracked the UTME code. Our AI has analyzed over{" "}
              <b className="text-[#FF6636]">20,000 JAMB questions</b> from the past 15 years to
              create a laser-focused curriculum that predicts the most likely exam topics.
            </p>
            <p className="mt-3 leading-relaxed text-white/80">
              Combined with expert tutors and proven teaching methods, we give you the unfair
              advantage you need to score 280+ and get into your dream university.
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
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF6636] text-white">
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
            <h2 className="mt-4 font-display text-3xl tracking-[0.02em] text-[#0A033C] md:text-4xl">
              Win ₦20 million in scholarships!
            </h2>
            <p className="mt-3 text-ink-600">
              Every student in the programme competes for scholarships and weekly prizes.
            </p>
          </div>
          <ul className="space-y-3">
            {PRIZES.map((p) => (
              <li key={p.n} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FF6636] font-display text-lg text-white">
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
      <section id="packages" className="scroll-mt-24 bg-[#FFF8F2] pb-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl tracking-[0.02em] text-[#0A033C] md:text-4xl">
              Choose your package
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className={
                  p.featured
                    ? "relative rounded-3xl border-2 border-[#FF6636] bg-white p-8 shadow-card"
                    : "relative rounded-3xl border border-ink-100 bg-white p-8 shadow-soft"
                }
              >
                {p.featured && (
                  <span className="absolute -top-3 right-6 rounded-full bg-[#FF6636] px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className="font-display text-2xl tracking-[0.02em] text-[#0A033C]">{p.name}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#FF6636]">{p.tag}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-sm text-ink-400 line-through">{p.old}</span>
                  <span className="font-display text-4xl tracking-[0.02em] text-[#0A033C]">{p.price}</span>
                  <span className="text-sm font-semibold text-ink-500">/student</span>
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
                      ? "mt-8 block rounded-xl bg-[#FF6636] px-8 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#FF7A4D]"
                      : "mt-8 block rounded-xl bg-[#0A033C] px-8 py-4 text-center text-sm font-bold text-white transition-colors hover:bg-[#1c1155]"
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
