import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Entrance Exams — Prepare for Top Schools in Nigeria & Abroad | NUVORA",
  description:
    "Expert prep for WAEC, IGCSE, GCSE, BECE, 11+, Common Entrance and SAT to guarantee your child's high performance — 95% success rate.",
  path: "/entrance-exam",
});

const RATES = [
  { subject: "Math", pct: 98 },
  { subject: "English", pct: 89 },
  { subject: "Science", pct: 92 },
];

const EXAMS = [
  { code: "WAEC", name: "West African Examinations Council" },
  { code: "IGCSE", name: "International General Certificate" },
  { code: "GCSE", name: "General Certificate of Secondary Education" },
  { code: "BECE", name: "Basic Education Certificate Exam" },
  { code: "11+", name: "Eleven Plus Entrance Exam" },
  { code: "CE", name: "Common Entrance into Top Schools" },
  { code: "SAT", name: "Scholastic Assessment Test" },
  { code: "SSCE", name: "Senior School Certificate Exam" },
];

export default function EntranceExamPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Entrance Exams", item: "https://nuvora.com/entrance-exam" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <PageHero
        eyebrow="95% Success Rate"
        title="Prepare for Entrance Exams into Top Schools in Nigeria & Abroad"
        subtitle="Expert prep for WAEC, IGCSE, GCSE, BECE, 11+, Common Entrance, and SAT to guarantee your child's high performance."
        crumbs={[{ name: "Home", href: "/" }, { name: "Entrance Exams" }]}
        align="center"
      >
        <a href="#rates" className="btn-gold">Book a Slot</a>
      </PageHero>

      {/* Success rates */}
      <section id="rates" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
              Get top grades in tests &amp; exams
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Prepare for entrance exams into top schools in Nigeria &amp; the UK — Loyola Jesuit,
              Grange, St. Saviour&apos;s, King&apos;s College UK, CIS and federal schools — with
              past-paper practice and mock examinations.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Past-paper practice for every board",
                "Mock exams with detailed feedback",
                "Small-group revision cohorts",
                "Weekly progress reports for parents",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6 rounded-3xl border border-ink-100 bg-surface-muted p-8">
            {RATES.map((r) => (
              <Progress key={r.subject} label={`${r.subject} success rate`} value={r.pct} />
            ))}
            <p className="pt-2 text-xs text-ink-400">
              Success rate across our 2025–26 exam cohorts (WAEC, NECO, Common Entrance, SAT).
            </p>
          </div>
        </div>
      </section>

      {/* Exams covered */}
      <section className="bg-surface-muted py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl text-center">
            Exams we prepare for
          </h2>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5">
            {EXAMS.map((e) => (
              <div key={e.code} className="rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-soft">
                <div className="font-display text-3xl tracking-[0.02em] text-brand-blue">{e.code}</div>
                <p className="mt-2 text-xs font-semibold text-ink-500 leading-snug">{e.name}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/exam-prep" className="inline-block rounded-full bg-brand-gold px-9 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5">
              Explore exam prep programmes
            </Link>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
