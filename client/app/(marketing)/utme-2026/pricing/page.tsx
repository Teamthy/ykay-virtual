import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 Pricing — Mastery & Plus Plans | NUVORA",
  description:
    "Choose your UTME 2026 prep package: Mastery Plan ₦35,000 or Plus Plan ₦52,500 — 4 months of intensive live classes, 200+ practice exams, weekly mocks. 30% discount ends soon.",
  path: "/utme-2026/pricing",
  noIndex: true,
});

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

const INSTALMENTS = [
  { plan: "Mastery Plan", full: "₦35,000", option: "3 monthly payments of ₦11,700" },
  { plan: "Plus Plan", full: "₦52,500", option: "3 monthly payments of ₦17,500" },
];

export default function UtmePricingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "UTME 2026", item: "https://nuvora.com/utme-2026" },
    { name: "Pricing", item: "https://nuvora.com/utme-2026/pricing" },
  ]);

  return (
    <main className="bg-[#FFF7E4] min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Header */}
      <header className="border-b border-ink-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-6">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/utme-2026" className="font-display text-xl tracking-[0.02em] text-[#013920]">
              NUVORA <span className="text-[#4CCB31]">Prep</span>
            </Link>
            <div className="flex items-center gap-5 text-sm font-bold">
              <Link href="/utme-2026" className="text-ink-600 hover:text-[#013920]">Overview</Link>
              <Link href="/utme-2026/pricing" className="text-[#4CCB31]">Pricing</Link>
              <Link href="/utme-2026/faq" className="text-ink-600 hover:text-[#013920]">FAQ</Link>
              <Link href="/utme-2026" className="rounded-xl bg-[#013920] px-5 py-2.5 text-white hover:bg-[#0A4D32] transition-colors">
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#4CCB31] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white">
              Choose your package
            </p>
            <h1 className="mt-4 font-display text-4xl tracking-[0.02em] text-[#013920] md:text-5xl">
              UTME 2026 Prep Pricing
            </h1>
            <p className="mt-3 text-ink-600">
              30% discount ends soon — instalment payment available on both plans.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
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
                <h2 className="font-display text-2xl tracking-[0.02em] text-[#013920]">{p.name}</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#4CCB31]">{p.tag}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-sm text-ink-400 line-through">{p.old}</span>
                  <span className="font-display text-4xl tracking-[0.02em] text-[#013920]">{p.price}</span>
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
                  href="/utme-2026#callback"
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

          {/* Instalment note */}
          <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
            <h2 className="font-bold text-ink-800">Instalment payment available</h2>
            <div className="mt-4 space-y-2">
              {INSTALMENTS.map((i) => (
                <div key={i.plan} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm">
                  <span className="font-semibold text-ink-800">{i.plan} — {i.full}</span>
                  <span className="text-ink-600">{i.option}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-400">
              First instalment due at enrolment. Fees are held securely until the cohort begins.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
