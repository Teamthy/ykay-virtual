import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Success Stories — Results, Competitions & Testimonials | NUVORA",
  description:
    "Learner results, competition achievements and parent stories at NUVORA. Testimonials appear with consent only.",
  path: "/success-stories",
});

// Verified-claim results from our academic leadership (see About page).
// Testimonial cards are [PLACEHOLDER] until real consent-gated content exists.
const RESULTS = [
  {
    title: "International Coding Olympiad 2026 — Rome, Italy",
    body: "Our delegation competed at the 2026 International Coding Olympiad and won medals — including a Nigerian student achieving a world Top-3 result in the Codementum category.",
    tag: "Competitions",
  },
  {
    title: "IGCSE Computer Science outcomes",
    body: "Our Computing department has prepared learners for IGCSE Computer Science with students achieving exceptional national outcomes.",
    tag: "Examinations",
  },
];

export default function SuccessStoriesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Success Stories", item: "https://nuvora.com/success-stories" },
  ]);
  const faq = faqJsonLd([
    {
      question: "Can I share my family's story?",
      answer:
        "Yes — we'd love to hear it. Testimonials are published only with explicit consent. Get in touch through the contact page.",
    },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Success Stories" }]} />

      <PageHero
        eyebrow="Real outcomes, verified"
        title="Success Stories"
        subtitle="Results, competition achievements and family stories. Testimonials are published with explicit consent only — no fabricated claims."
        crumbs={[{ name: "Home", href: "/" }, { name: "Success Stories" }]}
        align="center"
      />


      <section className="mt-14 grid md:grid-cols-2 gap-5">
        {RESULTS.map((r) => (
          <div key={r.title} className="border rounded-2xl p-6 hover:shadow-lift transition-shadow">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
              {r.tag}
            </span>
            <h2 className="font-bold mt-3 text-lg">{r.title}</h2>
            <p className="mt-2 text-sm text-ink-600 leading-relaxed">{r.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold mb-5">Case studies</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { title: "[Case study — pending consent]", body: "The learner's starting point, the plan, the outcome and the family's journey — published only with explicit consent and documentary support." },
            { title: "[Case study — pending consent]", body: "From foundation to exam success: how a structured NUVORA programme turned a learner's year around." },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl bg-ink-50 border border-dashed border-ink-200 p-6">
              <h3 className="font-bold text-sm">{c.title}</h3>
              <p className="mt-2 text-sm text-ink-600 italic">“{c.body}”</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold mb-5">Parent & student stories</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {[
            { name: "[Parent testimonial — pending consent]", body: "[Real story pending: outcome, subject, journey and consent-gated publication.]" },
            { name: "[Student testimonial — pending consent]", body: "[Real story pending: outcome, subject, journey and consent-gated publication.]" },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl bg-ink-50 border border-dashed border-ink-200 p-6">
              <p className="text-sm text-ink-600 italic">“{t.body}”</p>
              <p className="mt-3 text-xs font-semibold text-ink-400">— {t.name}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-400">
          Photos and details appear only with explicit, consent-controlled publication — never without.
          Share your family&apos;s story via the contact page.
        </p>
      </section>

      <section className="mt-14 text-center border rounded-3xl p-10">
        <h2 className="text-2xl font-extrabold">Your learner could be next</h2>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/programmes" className="btn-primary">Find a programme</Link>
          <Link href="/private-tuition" className="btn-gold">Request private tuition</Link>
        </div>
      </section>
    </main>
  );
}
