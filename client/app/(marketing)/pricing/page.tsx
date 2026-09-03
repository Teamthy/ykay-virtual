"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { PageHero } from "@/components/layout/PageHero";

const PLANS = [
  {
    name: "Cohort",
    priceOnce: "₦35,000",
    priceMonthly: "₦11,700",
    per: "per term",
    perMonthly: "/mo · 3 payments",
    desc: "Small-group live classes for exam prep",
    features: [
      "Live lessons with a vetted tutor",
      "Lesson notes, resources & homework",
      "Weekly progress reports",
      "Escrow-protected payment",
    ],
    cta: "Join a cohort",
    href: "/cohorts",
    popular: false,
  },
  {
    name: "Private Tuition",
    priceOnce: "₦8,000",
    priceMonthly: "₦8,000",
    per: "per hour",
    perMonthly: "/hr",
    desc: "One-to-one with a top-rated tutor",
    features: [
      "One-to-one, 60-minute sessions",
      "Flexible scheduling - home or online",
      "Attendance tracking",
      "Escrow-protected payment",
    ],
    cta: "Book a tutor",
    href: "/private-tuition",
    popular: true,
  },
  {
    name: "YK-Virtual Plus",
    priceOnce: "₦52,500",
    priceMonthly: "₦52,500",
    per: "per month",
    perMonthly: "/mo",
    desc: "Premium tutoring with a dedicated mentor",
    features: [
      "Priority matching with vetted specialists",
      "Dedicated learning mentor",
      "Priority scheduling",
      "Weekly premium reports",
    ],
    cta: "Unlock Plus",
    href: "/plus",
    popular: false,
  },
  {
    name: "Schools & Corporate",
    priceOnce: "Custom",
    priceMonthly: "Custom",
    per: "",
    perMonthly: "",
    desc: "Bulk seats for institutions & teams",
    features: [
      "Bulk enrolment with pooled invoices",
      "Assign teachers & track progress",
      "Dedicated account manager",
      "Custom curricula",
    ],
    cta: "Talk to sales",
    href: "/for-schools",
    popular: false,
  },
];

const COMPARE = [
  { f: "Live lessons with vetted tutors", v: [true, true, true, true] },
  { f: "Lesson notes, resources & homework", v: [true, true, true, true] },
  { f: "Attendance tracking", v: [true, true, true, true] },
  { f: "Weekly progress reports", v: [true, true, true, true] },
  { f: "Escrow-protected payment", v: [true, true, true, true] },
  { f: "Dedicated learning mentor", v: [false, true, true, true] },
  { f: "Priority scheduling", v: [false, false, true, true] },
  { f: "Bulk seats & pooled invoices", v: [false, false, false, true] },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"once" | "monthly">("once");

  return (
    <main className="bg-surface pb-20">
      {/* Hero with background image */}
      <PageHero
        cover="/hero/programmes.jpg"
        announcement="Clear, honest pricing"
        title="Pricing"
        subtitle="Whatever your status, our offers evolve according to your needs - every payment is escrow-protected."
        crumbs={[{ name: "Home", href: "/" }, { name: "Pricing" }]}
        align="center"
      />

      {/* Billing switch */}
      <div className="mt-8 flex items-center justify-center gap-x-3">
        <span className="text-sm font-medium text-ink-800">Per term</span>
        <label className="relative inline-block h-6 w-11 cursor-pointer">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={billing === "monthly"}
            onChange={(e) => setBilling(e.target.checked ? "monthly" : "once")}
          />
          <span className="absolute inset-0 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand-gold peer-disabled:opacity-50" />
          <span className="absolute top-1/2 left-0.5 size-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-full" />
        </label>
        <span className="relative text-sm font-medium text-ink-800">
          Monthly instalments
          <span className="absolute -top-10 left-1/2 -translate-x-1/2">
            <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-brand-gold px-2.5 py-1 text-[11px] font-semibold uppercase leading-5 text-ink-900">
              Save up to 10%
            </span>
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="mx-auto mt-12 grid max-w-[1400px] gap-6 px-6 sm:grid-cols-2 md:px-10 lg:grid-cols-4 lg:items-center">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={
              p.popular
                ? "flex flex-col rounded-2xl border-2 border-brand-gold bg-white p-8 text-center shadow-xl ring-1 ring-brand-gold/20"
                : "flex flex-col rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-soft"
            }
          >
            {p.popular && (
              <p className="mb-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gold-light px-3 py-1.5 text-xs font-semibold uppercase text-brand-gold-dark">
                  Most popular
                </span>
              </p>
            )}
            <h3 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              {p.name}
            </h3>
            <span className="mt-5 font-display text-5xl tracking-[0.02em] text-ink-900">
              {billing === "once" ? p.priceOnce : p.priceMonthly}
            </span>
            <p className="mt-2 text-sm text-ink-500">
              {billing === "once" ? p.per : p.perMonthly}
            </p>
            <p className="mt-1 text-sm text-ink-500">{p.desc}</p>

            <ul className="mt-7 flex-1 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-x-2">
                  <Check size={15} className="shrink-0 text-brand-gold-dark" />
                  <span className="text-left text-ink-800">{f}</span>
                </li>
              ))}
            </ul>

            <Link
              href={p.href}
              className={
                p.popular
                  ? "mt-5 rounded-lg bg-brand-gold py-3 px-4 text-sm font-medium text-ink-900 transition-colors hover:bg-brand-gold-hover"
                  : "mt-5 rounded-lg border border-ink-200 bg-white py-3 px-4 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
              }
            >
              {p.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mx-auto mt-20 max-w-[1400px] px-6 md:px-10">
        <div className="mb-10 text-center">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy">
            Compare plans
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-500">
            A clear look at what each plan includes — so you pick the right one
            with confidence.
          </p>
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-ink-200 bg-white lg:block">
          <table className="w-full">
            <thead className="border-b border-ink-200 bg-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-ink-800">
                  Features
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.name}
                    className="w-1/4 px-6 py-4 text-center text-lg font-medium text-ink-900"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {COMPARE.map((row) => (
                <tr
                  key={row.f}
                  className="transition-colors hover:bg-ink-50/60"
                >
                  <th className="px-6 py-5 text-left text-sm font-normal text-ink-600">
                    {row.f}
                  </th>
                  {row.v.map((inc, i) => (
                    <td key={i} className="px-6 py-5">
                      {inc ? (
                        <Check
                          size={18}
                          className="mx-auto text-brand-gold-dark"
                          aria-label={`Included in ${PLANS[i].name}`}
                        />
                      ) : (
                        <Minus
                          size={18}
                          className="mx-auto text-ink-300"
                          aria-label={`Not included in ${PLANS[i].name}`}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-8 lg:hidden">
          {PLANS.map((p, pi) => (
            <section key={p.name}>
              <div className="mb-3 px-1">
                <h3 className="text-lg font-semibold text-ink-900">{p.name}</h3>
              </div>
              <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-200 bg-white">
                {COMPARE.map((row) => (
                  <li
                    key={row.f}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="text-ink-600">{row.f}</span>
                    {row.v[pi] ? (
                      <Check size={16} className="text-brand-gold-dark" />
                    ) : (
                      <Minus size={16} className="text-ink-300" />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* Disclaimer + policy */}
      <div className="mx-auto mt-14 max-w-[1400px] px-6 md:px-10">
        <p className="text-xs text-ink-400">
          Pricing shown is indicative guidance and may vary by tutor experience,
          subject and level. The final quote is always agreed before payment.
          Institutional pricing for schools and companies is available via the{" "}
          <Link
            href="/for-schools"
            className="font-semibold text-brand-gold-dark"
          >
            for schools
          </Link>{" "}
          and{" "}
          <Link
            href="/corporate-training"
            className="font-semibold text-brand-gold-dark"
          >
            corporate training
          </Link>{" "}
          pages.
        </p>

        <section className="mt-10 rounded-2xl border border-ink-200 bg-white p-8">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
            Cancellation &amp; reschedule policy
          </h2>
          <div className="mt-4 grid gap-6 text-sm text-ink-700 md:grid-cols-3">
            <div>
              <h3 className="font-bold text-ink-900">Rescheduling</h3>
              <p className="mt-1.5">
                Lessons can be rescheduled free of charge within your package
                window - with at least 24 hours notice where possible.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-ink-900">Cancellation</h3>
              <p className="mt-1.5">
                Unused escrow balances are refundable per policy. Cancellation
                requests are handled by our support team within one business
                day.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-ink-900">Tutor no-show</h3>
              <p className="mt-1.5">
                If a tutor cannot deliver a scheduled lesson, the session is not
                counted and the escrow balance is protected - full refunds where
                required.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 max-w-2xl">
          <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
            Frequently asked questions
          </h2>
          <div className="mt-4 space-y-3">
            {[
              {
                q: "What is included in the price?",
                a: "Live lessons, resources, lesson notes and progress reports. Exam packages add mocks and past-paper practice.",
              },
              {
                q: "How do I pay?",
                a: "Securely by card or bank transfer via our payment gateway. Funds sit in escrow and are released only when lessons are delivered.",
              },
              {
                q: "Can I cancel or reschedule?",
                a: "Yes. Rescheduling is free within your package window. Cancellations follow our published policy and unused escrow balances are refundable per policy.",
              },
            ].map((f) => (
              <details
                key={f.q}
                className="rounded-xl border border-ink-200 bg-white px-5 py-4"
              >
                <summary className="cursor-pointer font-semibold text-ink-900">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
