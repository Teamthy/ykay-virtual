"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus, ArrowRight } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";

const PLANS = [
  {
    name: "Cohort",
    priceOnce: "₦35,000",
    priceMonthly: "₦11,700",
    per: "per term",
    desc: "Small-group live classes for exam prep",
    features: ["Live lessons with vetted tutor", "Lesson notes & homework", "Weekly progress reports", "Escrow-protected payment"],
    cta: "Join a cohort",
    href: "/cohorts",
    popular: false,
  },
  {
    name: "Private Tuition",
    priceOnce: "₦8,000",
    priceMonthly: "₦8,000",
    per: "per hour",
    desc: "One-to-one with a top-rated tutor",
    features: ["One-to-one, 60-min sessions", "Flexible scheduling", "Attendance tracking", "Escrow-protected payment"],
    cta: "Book a tutor",
    href: "/private-tuition",
    popular: true,
  },
  {
    name: "Plus",
    priceOnce: "₦52,500",
    priceMonthly: "₦52,500",
    per: "per month",
    desc: "Premium tutoring with mentor",
    features: ["Priority matching", "Dedicated mentor", "Priority scheduling", "Weekly premium reports"],
    cta: "Unlock Plus",
    href: "/plus",
    popular: false,
  },
  {
    name: "Schools",
    priceOnce: "Custom",
    priceMonthly: "Custom",
    per: "",
    desc: "Bulk seats for institutions",
    features: ["Bulk enrolment", "Assign teachers", "Dedicated manager", "Custom curricula"],
    cta: "Talk to sales",
    href: "/for-schools",
    popular: false,
  },
];

const COMPARE = [
  { f: "Live lessons with vetted tutors", v: [true, true, true, true] },
  { f: "Lesson notes & homework", v: [true, true, true, true] },
  { f: "Attendance tracking", v: [true, true, true, true] },
  { f: "Weekly progress reports", v: [true, true, true, true] },
  { f: "Escrow-protected payment", v: [true, true, true, true] },
  { f: "Dedicated mentor", v: [false, true, true, true] },
  { f: "Priority scheduling", v: [false, false, true, true] },
  { f: "Bulk seats & invoices", v: [false, false, false, true] },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"once" | "monthly">("once");

  return (
    <main className="w-full overflow-hidden bg-[#F9F6ED]">
      <PageHero cover="/hero/checkout.jpg" announcement="Clear, honest pricing" title="Pricing" subtitle="Whatever your status, our offers evolve according to your needs — every payment is escrow-protected." crumbs={[{ name: "Home", href: "/" }, { name: "Pricing" }]} align="center" />

      <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-12 lg:py-16">
        <div className="mx-auto max-w-[1200px]">
          {/* billing switch */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white p-1.5 border border-black/10 shadow-sm">
              <button onClick={() => setBilling("once")} className={`rounded-full px-5 py-2 text-[12px] font-bold transition ${billing === "once" ? "bg-[#0F2A1A] text-white" : "text-[#0F2A1A]/65 hover:text-[#0F2A1A]"}`}>Per term</button>
              <button onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-[12px] font-bold transition ${billing === "monthly" ? "bg-[#0F2A1A] text-white" : "text-[#0F2A1A]/65 hover:text-[#0F2A1A]"}`}>Monthly</button>
            </div>
          </div>

          {/* plans */}
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div key={p.name} className={`flex flex-col rounded-[20px] p-6 border ${p.popular ? "bg-[#D6FF57] border-[#D6FF57] shadow-[0_12px_40px_rgba(214,255,87,0.3)]" : "bg-white border-black/10 shadow-[0_4px_24px_rgba(15,42,26,0.06)]"}`}>
                {p.popular && <span className="mb-3 inline-flex w-fit rounded-full bg-[#0F2A1A] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Most popular</span>}
                <h3 className="font-display text-[18px] uppercase text-[#0F2A1A]">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-[32px] leading-none text-[#0F2A1A]">{billing === "once" ? p.priceOnce : p.priceMonthly}</span>
                  <span className="text-[12px] text-[#0F2A1A]/65">{billing === "once" ? p.per : ""}</span>
                </div>
                <p className="mt-2 text-[12px] text-[#0F2A1A]/65">{p.desc}</p>
                <ul className="mt-6 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[12px] font-medium text-[#0F2A1A]"><Check size={12} className="text-[#0F2A1A]" /> {f}</li>
                  ))}
                </ul>
                <Link href={p.href} className={`mt-6 inline-flex items-center justify-between rounded-full px-5 py-3 text-[13px] font-bold transition ${p.popular ? "bg-[#0F2A1A] text-white hover:bg-black" : "bg-[#0F2A1A] text-white hover:bg-black"}`}>
                  <span>{p.cta}</span><span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={12} /></span>
                </Link>
              </div>
            ))}
          </div>

          {/* compare */}
          <div className="mt-16">
            <h2 className="font-display text-[24px] uppercase text-[#0F2A1A] text-center">Compare plans</h2>
            <div className="mt-8 overflow-hidden rounded-[20px] bg-white border border-black/10 hidden lg:block">
              <table className="w-full">
                <thead className="border-b border-black/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-[12px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Features</th>
                    {PLANS.map((p) => (
                      <th key={p.name} className="px-6 py-4 text-center font-display text-[16px] uppercase text-[#0F2A1A]">{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {COMPARE.map((row) => (
                    <tr key={row.f} className="hover:bg-[#F9F6ED]/60">
                      <th className="px-6 py-4 text-left text-[13px] font-medium text-[#0F2A1A]/70">{row.f}</th>
                      {row.v.map((inc, i) => (
                        <td key={i} className="px-6 py-4 text-center">{inc ? <Check size={16} className="mx-auto text-[#0F2A1A]" /> : <Minus size={16} className="mx-auto text-black/20" />}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
