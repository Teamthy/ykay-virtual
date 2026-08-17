"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, LifeBuoy, ArrowRight, ChevronDown } from "lucide-react";
import { HELP_CATEGORIES } from "@/lib/help-data";
import { PageHero } from "@/components/layout/PageHero";

// Help Center — searchable, categorised FAQ hub (single source of truth is
// lib/help-data.ts). Client-side search across every question + answer.

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;
    const hits: { category: string; faq: { q: string; a: string } }[] = [];
    for (const cat of HELP_CATEGORIES) {
      for (const faq of cat.faqs) {
        if (faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q)) {
          hits.push({ category: cat.title, faq });
        }
      }
    }
    return hits;
  }, [q]);

  return (
    <main className="container-x py-12">
      <PageHero
        eyebrow="Help Center"
        title="How can we help?"
        subtitle="Search for an answer, or browse by topic. If you can't find it, our team is one message away."
        align="center"
      />

      {/* Search */}
      <div className="mx-auto -mt-8 max-w-xl">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. escrow, refunds, vetting…"
            aria-label="Search help articles"
            className="w-full rounded-full border border-ink-200 bg-white py-4 pl-12 pr-5 text-sm shadow-card focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
          />
        </div>
      </div>

      {/* Search results */}
      {results && (
        <section className="mx-auto mt-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
          </p>
          <div className="mt-4 space-y-3">
            {results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
                <p className="text-sm text-ink-600">No matching articles. Try a different term, or contact us below.</p>
              </div>
            )}
            {results.map((r) => (
              <details key={r.faq.q} className="rounded-2xl border border-ink-100 bg-white p-5">
                <summary className="cursor-pointer font-semibold text-brand-navy">{r.faq.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-600">{r.faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {!results && (
        <section className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {HELP_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">{cat.title}</h2>
              <p className="mt-1 text-sm text-ink-500">{cat.blurb}</p>
              <div className="mt-4 space-y-2">
                {cat.faqs.map((f) => (
                  <details
                    key={f.q}
                    open={open === f.q}
                    onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open ? f.q : null)}
                    className="rounded-xl border border-ink-100 px-4 py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-ink-800 [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <ChevronDown size={15} className={`shrink-0 text-ink-400 transition-transform ${open === f.q ? "rotate-180" : ""}`} />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Contact CTA */}
      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-brand-navy p-10 text-center text-white">
        <LifeBuoy size={28} className="mx-auto text-brand-gold" />
        <h2 className="mt-4 font-display text-2xl tracking-[0.02em]">Still need help?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Our support team usually replies within one working day.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5"
        >
          Contact support <ArrowRight size={15} />
        </Link>
      </section>
    </main>
  );
}
