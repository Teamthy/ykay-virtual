import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 Pricing - Mastery & Plus | NUVORA",
  description:
    "Indicative UTME prep packages on nuvora.com - live classes, recordings, mocks and parent reports. Same login on mobile.",
  path: "/utme-2026/pricing",
});

const PACKAGES = [
  {
    name: "UTME Mastery",
    price: "₦35,000",
    note: "Indicative · confirm before pay",
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
    note: "Indicative · confirm before pay",
    featured: true,
    features: [
      "Everything in Mastery",
      "Remedial office hours",
      "Smaller group + named mentor",
      "Priority advisor replies",
    ],
  },
];

export default function UtmePricingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "UTME 2026", item: "https://nuvora.com/utme-2026" },
    { name: "Pricing", item: "https://nuvora.com/utme-2026/pricing" },
  ]);

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <PageHero
        eyebrow="Same login on mobile"
        title="UTME 2026 pricing"
        subtitle="Packages sit on nuvora.com - one wallet, one account. Figures below are indicative until you enrol."
        crumbs={[{ name: "Home", href: "/" }, { name: "UTME 2026", href: "/utme-2026" }, { name: "Pricing" }]}
        image={{ src: "/hero/utme.jpg", alt: "Student preparing for UTME" }}
        ctas={[{ label: "Request a callback", href: "/utme-2026", primary: true }]}
      />
      <section className="container-x pb-20 pt-16 md:pt-20">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PACKAGES.map((p) => (
            <div
              key={p.name}
              className={
                p.featured
                  ? "rounded-3xl border-2 border-brand-gold bg-white p-8 shadow-card"
                  : "rounded-3xl border border-ink-100 bg-white p-8 shadow-soft"
              }
            >
              <h2 className="font-display text-2xl text-brand-navy">{p.name}</h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-ink-400">{p.note}</p>
              <p className="mt-4 font-display text-4xl text-brand-navy">{p.price}</p>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/utme-2026" className="mt-8 block rounded-xl bg-brand-navy px-8 py-4 text-center text-sm font-bold text-white">
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
