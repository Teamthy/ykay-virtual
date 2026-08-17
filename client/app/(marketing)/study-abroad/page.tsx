import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Globe2, GraduationCap, FileCheck2, Plane, Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Study Abroad — Live, Work & Study Overseas | NUVORA",
  description:
    "Test prep (IELTS, GRE, GMAT, TOEFL) and application guidance for study in the US, UK, Canada and Australia.",
  path: "/study-abroad",
});

const SERVICES = [
  {
    icon: <FileCheck2 size={20} />,
    title: "Perfect Test Scores",
    desc: "IELTS, GRE, GMAT, TOEFL, PTE and SAT prep with structured strategies and vetted tutors.",
  },
  {
    icon: <GraduationCap size={20} />,
    title: "University Admissions",
    desc: "University shortlisting and application coaching for the US, UK, Canada and Australia.",
  },
  {
    icon: <Plane size={20} />,
    title: "Relocation & Visa Support",
    desc: "Guidance through applications, visas and travel so you can live, work and thrive abroad.",
  },
];

export default function StudyAbroadPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Study Abroad", item: "https://nuvora.com/study-abroad" },
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
              href="#services"
              className="inline-flex items-center gap-x-2 rounded-full border border-ink-200 bg-white p-1 ps-3 text-sm text-ink-800 shadow-sm transition hover:border-brand-gold"
            >
              Admissions &amp; Travels
              <span className="inline-flex items-center gap-x-2 rounded-full bg-brand-gold-light px-2.5 py-1.5 font-semibold text-brand-gold-dark">
                Apply today
              </span>
            </a>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h1 className="font-display text-4xl tracking-[0.02em] text-ink-900 md:text-5xl lg:text-6xl">
              Live, work and{" "}
              <span className="bg-clip-text bg-gradient-to-tl from-brand-gold-dark to-brand-gold text-transparent">
                study abroad
              </span>
            </h1>
          </div>

          <div className="mx-auto mt-5 max-w-3xl text-center">
            <p className="text-lg text-ink-600">
              Get help with course selection, test scores and applications for study in the US, UK, Canada and Australia.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#services"
              className="inline-flex items-center gap-x-3 rounded-md bg-gradient-to-tl from-brand-gold-dark to-brand-gold py-3 px-4 text-sm font-medium text-white transition-all hover:from-brand-gold hover:to-brand-gold-hover"
            >
              Start your journey
              <ArrowRight size={16} />
            </a>
            <a
              href="/gmat"
              className="inline-flex items-center gap-x-2 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
            >
              Test prep →
            </a>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Destinations:</span>
              <span className="text-sm font-bold text-ink-900">US · UK · Canada · Australia</span>
            </div>
            <svg className="hidden size-5 text-ink-300 sm:block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Focus:</span>
              <span className="text-sm font-bold text-ink-900">Test prep + applications</span>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-100">
            <Image
              src="/hero/international.jpg"
              alt="Graduates celebrating international success"
              width={1200}
              height={630}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section id="services" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-ink-100 bg-cover bg-center p-7 text-white shadow-card"
                style={{
                  backgroundImage:
                    "linear-gradient(165deg, rgba(6,15,38,0.88), rgba(1,57,32,0.65)), url(/hero/international.jpg)",
                }}
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white">
                  {s.icon}
                </div>
                <h2 className="mt-4 font-bold">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
                Study, Work, and Thrive Abroad with Perfect Test Scores
              </h2>
              <p className="mt-4 text-ink-600 leading-relaxed">
                Prepare for IELTS, GRE, GMAT, TEF and more with proven strategies and top tutors.
                We do not publish an unverified exam-success percentage.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "IELTS / TOEFL / PTE academic prep",
                  "GRE & GMAT for graduate admissions",
                  "Personal statement and application coaching",
                  "University shortlisting with an advisor",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/gmat" className="rounded-full bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5">
                  Start test prep
                </Link>
                <Link href="/contact" className="rounded-xl border border-ink-200 px-8 py-4 text-sm font-bold text-ink-700 hover:bg-ink-100 transition-colors">
                  Talk to an advisor
                </Link>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#060F26] to-brand-navy p-8 text-white shadow-card">
              <Globe2 size={120} className="absolute -right-6 -bottom-6 text-white/10" />
              <p className="font-display text-3xl tracking-[0.02em]">Destinations</p>
              <p className="mt-1 text-white/80">US, UK, Canada &amp; Australia</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { c: "US", n: "USA" },
                  { c: "UK", n: "UK" },
                  { c: "Canada", n: "CA" },
                  { c: "Australia", n: "AU" },
                ].map((d) => (
                  <div key={d.c} className="rounded-xl bg-white/10 p-4">
                    <p className="font-display text-2xl tracking-[0.02em]">{d.n}</p>
                    <p className="text-xs font-semibold text-white/70">{d.c} institutions</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
