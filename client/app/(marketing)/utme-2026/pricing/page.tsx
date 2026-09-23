import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "UTME 2026 Pricing - Mastery & Plus | YK-Virtual",
  description:
    "Indicative UTME prep packages on virtual.ykaycollege.com - live classes, recordings, mocks and parent reports. Same login on mobile.",
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
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "UTME 2026", item: "https://virtual.ykaycollege.com/utme-2026" },
    {
      name: "Pricing",
      item: "https://virtual.ykaycollege.com/utme-2026/pricing",
    },
  ]);

  return (
    <main className="bg-[#F9F6ED]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <PageHero
        cover="/hero/utme.jpg"
        eyebrow="The right support for your prep"
        title="UTME pricing, made clear."
        subtitle="Indicative 2026 packages. Confirm the next available intake, timetable and current fee with an advisor before making a payment."
        crumbs={[{ name: "Home", href: "/" }, { name: "UTME 2026", href: "/utme-2026" }, { name: "Pricing" }]}
        ctas={[{ label: "Ask about availability", href: "/utme-2026#callback", primary: true }]}
      />
      <section className="w-full py-16 lg:py-24">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F2A1A]/65">01 / Your options</p>
              <h2 className="mt-2 max-w-[17ch] font-display text-[clamp(2rem,4vw,3.7rem)] uppercase text-[#0F2A1A]">Find a plan that fits.</h2>
            </div>
            <p className="max-w-[48ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">Both pathways include tutor-led learning and timed practice. Plus adds more one-to-one support when you need it.</p>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {PACKAGES.map((p, index) => (
              <article key={p.name} className={`flex flex-col rounded-[20px] border border-black/10 p-7 lg:p-10 ${p.featured ? "bg-[#D6FF57] text-[#0F2A1A]" : "bg-white text-[#0F2A1A]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0F2A1A]/65">0{index + 1} / {p.featured ? "More support" : "The essentials"}</p>
                  {p.featured && <span className="rounded-full bg-[#0F2A1A] px-3 py-1.5 text-[10px] font-bold uppercase text-white">Most support</span>}
                </div>
                <h3 className="mt-8 font-display text-[clamp(2rem,3vw,3rem)] uppercase text-[#0F2A1A]">{p.name}</h3>
                <p className="mt-1 text-[12px] font-semibold text-[#0F2A1A]/65">{p.note}</p>
                <p className="mt-5 font-display text-[clamp(2.5rem,4vw,4rem)] leading-none text-[#0F2A1A]">{p.price}</p>
                <div className="my-8 h-px bg-[#0F2A1A]/15" />
                <ul className="mb-10 space-y-3">
                  {p.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[13px] leading-relaxed text-[#0F2A1A]/85">
                      <Check size={17} className="mt-0.5 shrink-0 text-[#0F2A1A]" />{feature}
                    </li>
                  ))}
                </ul>
                <Link href="/utme-2026#callback" className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-[#194732]">Ask about availability <ArrowRight size={14} /></Link>
              </article>
            ))}
          </div>
          <p className="mt-7 text-center text-[13px] text-[#0F2A1A]/70">Want to know more? <Link href="/utme-2026/faq" className="font-bold text-[#0F2A1A] underline underline-offset-2">Read the FAQs</Link></p>
        </div>
      </section>
      <section className="w-full bg-[#0F2A1A] py-12 text-white lg:py-16">
        <div className="container-x flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D6FF57]">No surprises</p>
            <h2 className="mt-2 font-display text-[clamp(1.8rem,3vw,3rem)] uppercase text-white">Talk it through first.</h2>
            <p className="mt-2 text-[13px] text-white/75">All listed prices are indicative until an advisor confirms availability.</p>
          </div>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">Contact an advisor <ArrowRight size={14} /></Link>
        </div>
      </section>
    </main>
  );
}
