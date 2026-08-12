import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { BookOpenCheck, GraduationCap, Languages, FileCheck, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Test Prep — IELTS, GMAT, GRE, TOEFL, SAT & More | NUVORA",
  description:
    "Get expert help to ace your exam — IELTS Prep, GMAT Classes, ICAN Prep, GRE Classes, ACT Prep, SATs Prep, TOEFL Prep and PTE Prep.",
  path: "/test-prep",
});

const TESTS = [
  { code: "IELTS", name: "International English Language Testing", icon: <Languages size={20} />, href: "/test-prep" },
  { code: "GMAT", name: "Graduate Management Admission Test", icon: <GraduationCap size={20} />, href: "/gmat" },
  { code: "ICAN", name: "Institute of Chartered Accountants of Nigeria", icon: <BookOpenCheck size={20} />, href: "/test-prep" },
  { code: "GRE", name: "Graduate Record Examinations", icon: <GraduationCap size={20} />, href: "/test-prep" },
  { code: "ACT", name: "American College Testing", icon: <FileCheck size={20} />, href: "/test-prep" },
  { code: "SAT", name: "Scholastic Assessment Test", icon: <FileCheck size={20} />, href: "/test-prep" },
  { code: "TOEFL", name: "Test of English as a Foreign Language", icon: <Languages size={20} />, href: "/test-prep" },
  { code: "PTE", name: "Pearson Test of English", icon: <Languages size={20} />, href: "/test-prep" },
];

export default function TestPrepPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Test Prep", item: "https://nuvora.com/test-prep" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Preline hero: announcement + gradient title + buttons */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-0 before:absolute before:inset-x-0 before:top-0 before:h-full before:bg-[radial-gradient(ellipse_at_top,rgba(244,180,0,0.10),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-14 md:px-10 md:pt-20">
          <div className="flex justify-center">
            <a
              href="#tests"
              className="inline-flex items-center gap-x-2 rounded-full border border-ink-200 bg-white p-1 ps-3 text-sm text-ink-800 shadow-sm transition hover:border-brand-gold"
            >
              Test season is here — 95% success rate
              <span className="inline-flex items-center gap-x-2 rounded-full bg-brand-gold-light px-2.5 py-1.5 font-semibold text-brand-gold-dark">
                IELTS · GMAT · GRE
              </span>
            </a>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h1 className="font-display text-4xl tracking-[0.02em] text-ink-900 md:text-5xl lg:text-6xl">
              Get expert help to{" "}
              <span className="bg-clip-text bg-gradient-to-tl from-brand-gold-dark to-brand-gold text-transparent">
                ace your exam
              </span>
            </h1>
          </div>

          <div className="mx-auto mt-5 max-w-3xl text-center">
            <p className="text-lg text-ink-600">
              IELTS, GMAT, ICAN, GRE, ACT, SATs, TOEFL and PTE — proven strategies and top tutors
              to get the score you need.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#tests"
              className="inline-flex items-center gap-x-3 rounded-md bg-gradient-to-tl from-brand-gold-dark to-brand-gold py-3 px-4 text-sm font-medium text-white transition-all hover:from-brand-gold hover:to-brand-gold-hover"
            >
              Get Started
              <ArrowRight size={16} />
            </a>
            <a
              href="/gmat"
              className="inline-flex items-center gap-x-2 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
            >
              GMAT Prep →
            </a>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Success rate:</span>
              <span className="text-sm font-bold text-ink-900">95%</span>
            </div>
            <svg className="hidden size-5 text-ink-300 sm:block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Score 28+ for US undergrad:</span>
              <span className="text-sm font-bold text-ink-900">Achievable</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tests grid */}
      <section id="tests" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {TESTS.map((t) => (
              <Link
                key={t.code}
                href={t.href}
                className="group rounded-2xl border border-ink-100 bg-surface-muted p-6 text-center transition-all hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-card"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-brand-blue shadow-soft transition-colors group-hover:bg-brand-navy group-hover:text-white">
                  {t.icon}
                </div>
                <div className="mt-4 font-display text-2xl tracking-[0.02em] text-brand-navy">{t.code}</div>
                <p className="mt-1 text-xs font-semibold text-ink-500 leading-snug">{t.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Score band */}
      <section className="bg-brand-navy py-14 text-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <p className="font-display text-3xl tracking-[0.02em] md:text-4xl">
              Score 28+ for US Undergraduate Admission
            </p>
            <p className="mt-3 text-white/75 leading-relaxed max-w-2xl">
              Target the exact scores admissions offices look for. Our tutors build a personal
              study plan around your diagnostic, then drill you with official materials and
              timed mock tests until exam day.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/private-tuition" className="rounded-xl bg-brand-gold px-8 py-4 text-sm font-bold text-brand-navy hover:bg-brand-gold-dark transition-colors">
              Get Started
            </Link>
            <Link href="/gmat" className="rounded-xl border-2 border-white/40 px-8 py-4 text-sm font-bold text-white hover:bg-white/10 transition-colors">
              GMAT Prep →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl text-center">
            How test prep works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Diagnostic test", d: "We assess your current level and target score to build a personal study plan." },
              { n: "2", t: "Structured sessions", d: "Learn proven strategies with a top-rated tutor — online or in person." },
              { n: "3", t: "Mocks until exam day", d: "Timed mock tests with detailed feedback so you walk in confident." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-ink-100 bg-surface-muted p-7 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-navy font-display text-xl text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold text-ink-800">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
