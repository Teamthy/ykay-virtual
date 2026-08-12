import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Globe2, GraduationCap, FileCheck2, Plane, Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Study Abroad — Live, Work & Study Overseas | NUVORA",
  description:
    "Apply to 1600+ universities and colleges in the US, UK, Canada and Australia. Test prep (IELTS, GRE, GMAT, TOEFL), application guidance and admissions support.",
  path: "/study-abroad",
});

const SERVICES = [
  {
    icon: <FileCheck2 size={20} />,
    title: "Perfect Test Scores",
    desc: "IELTS, GRE, GMAT, TOEFL, PTE and SAT prep with proven strategies and top tutors — 95% exam success rate.",
  },
  {
    icon: <GraduationCap size={20} />,
    title: "University Admissions",
    desc: "Apply to 1600+ universities and colleges in the US, UK, Canada and Australia with expert course selection.",
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

      <PageHero
        eyebrow="Admissions & Travels"
        title="Live, work and study abroad"
        subtitle="Apply to 1600+ universities and colleges in the US, UK, Canada, and Australia. Get expert help to study abroad with ease — from course selection to test scores."
        crumbs={[{ name: "Home", href: "/" }, { name: "Study Abroad" }]}
        align="center"
      >
        <a href="#services" className="btn-gold">Start your journey</a>
        <a href="/gmat" className="px-8 py-4 rounded-lg border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-colors">
          Test prep →
        </a>
      </PageHero>

      <section id="services" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-ink-100 bg-surface-muted p-7">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-brand-blue shadow-soft">
                  {s.icon}
                </div>
                <h2 className="mt-4 font-bold text-ink-800">{s.title}</h2>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">{s.desc}</p>
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
                Our 95% exam success rate means your applications stand out.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "IELTS / TOEFL / PTE academic prep",
                  "GRE & GMAT for graduate admissions",
                  "Personal statement and application coaching",
                  "University shortlisting across 1600+ institutions",
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navy to-brand-blue p-8 text-white shadow-card">
              <Globe2 size={120} className="absolute -right-6 -bottom-6 text-white/10" />
              <p className="font-display text-5xl tracking-[0.02em]">1600+</p>
              <p className="mt-1 text-white/80">universities &amp; colleges</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                {[
                  { c: "US", n: "480+" },
                  { c: "UK", n: "390+" },
                  { c: "Canada", n: "310+" },
                  { c: "Australia", n: "290+" },
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
