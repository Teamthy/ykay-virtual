"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, LifeBuoy, ArrowRight, ChevronDown } from "lucide-react";
import { HELP_CATEGORIES, slugify } from "@/lib/help-data";
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
    <main>
      
      <PageHero
        eyebrow="Help Center"
        title="How can we help?"
        subtitle="Search for an answer, or browse by topic. If you can't find it, our team is one message away."
        align="center"
      />

      <div className="container-x py-12">

      {/* Search */}
      <div className="mx-auto -mt-8 max-w-xl">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0F2A1A]/65" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. escrow, refunds, vetting…"
            aria-label="Search help articles"
            className="w-full rounded-full border border-black/10 bg-white py-4 pl-12 pr-5 text-sm shadow-card focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30"
          />
        </div>
      </div>

      {/* Search results */}
      {results && (
        <section className="mx-auto mt-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0F2A1A]/65">
            {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query.trim()}&rdquo;
          </p>
          <div className="mt-4 space-y-3">
            {results.length === 0 && (
              <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center">
                <p className="text-sm text-[#0F2A1A]/70">No matching articles. Try a different term, or contact us below.</p>
              </div>
            )}
            {results.map((r) => (
              <div key={r.faq.q} className="rounded-2xl border border-black/10 bg-white p-5">
                <Link
                  href={`/help/${slugify(r.faq.q)}`}
                  className="font-semibold text-[#0F2A1A] transition-colors hover:text-[#0F2A1A]"
                >
                  {r.faq.q}
                </Link>
                <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/70">{r.faq.a}</p>
                <Link
                  href={`/help/${slugify(r.faq.q)}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2A1A] hover:underline"
                >
                  Read article <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      {!results && (
        <section className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          {HELP_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-2xl border border-black/10 bg-white p-6 shadow-soft">
              <h2 className="font-display text-lg tracking-[0.02em] text-[#0F2A1A]">{cat.title}</h2>
              <p className="mt-1 text-sm text-[#0F2A1A]/65">{cat.blurb}</p>
              <div className="mt-4 space-y-2">
                {cat.faqs.map((f) => (
                  <details
                    key={f.q}
                    open={open === f.q}
                    onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open ? f.q : null)}
                    className="rounded-xl border border-black/10 px-4 py-3"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-[#0F2A1A]/85 [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <ChevronDown size={15} className={`shrink-0 text-[#0F2A1A]/65 transition-transform ${open === f.q ? "rotate-180" : ""}`} />
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[#0F2A1A]/70">{f.a}</p>
                    <Link
                      href={`/help/${slugify(f.q)}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F2A1A] hover:underline"
                    >
                      Read article <ArrowRight size={12} />
                    </Link>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Contact CTA */}
      <section className="mx-auto mt-14 max-w-3xl rounded-3xl bg-[#0F2A1A] p-10 text-center text-white">
        <LifeBuoy size={28} className="mx-auto text-[#0F2A1A]" />
        <h2 className="mt-4 font-display text-2xl tracking-[0.02em] text-white">Still need help?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Our support team usually replies within one working day.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-7 py-3.5 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030] hover:-translate-y-0.5"
        >
          Contact support <ArrowRight size={15} />
        </Link>
      </section>
    
      </div>
    </main>
  );
}
