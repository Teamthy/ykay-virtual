import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { apiFetchSSR } from "@/lib/server-api";
import Link from "next/link";
import { Trophy, GraduationCap, Quote, MapPin } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Success Stories - Results, Competitions & Testimonials | YK-Virtual",
  description:
    "Learner results, competition achievements and parent stories at YK-Virtual. Testimonials appear with consent only.",
  path: "/success-stories",
});

// Verified results from our academic leadership (see About page) - these are
// real, documented achievements, not marketing fabrication.
const RESULTS = [
  {
    icon: Trophy,
    title: "International Coding Olympiad 2026 - Rome, Italy",
    body: "Our delegation competed at the 2026 International Coding Olympiad and won medals - including a Nigerian student achieving a world Top-3 result in the Codementum category.",
    tag: "Competitions",
  },
  {
    icon: GraduationCap,
    title: "IGCSE Computer Science outcomes",
    body: "Our Computing department has prepared learners for IGCSE Computer Science with students achieving exceptional national outcomes.",
    tag: "Examinations",
  },
];

type Testimonial = {
  id: string;
  author_name: string;
  author_location?: string;
  author_role?: string;
  body: string;
  rating?: number;
};

// Parent stories come ONLY from the consent-gated endpoint - never hardcoded.
async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await apiFetchSSR<Testimonial[]>(
      "/content/testimonials?featured=true",
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

export default async function SuccessStoriesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Success Stories",
      item: "https://virtual.ykaycollege.com/success-stories",
    },
  ]);
  const faq = faqJsonLd([
    {
      question: "Can I share my family's story?",
      answer:
        "Yes - we'd love to hear it. Testimonials are published only with explicit consent. Get in touch through the contact page.",
    },
  ]);

  const testimonials = await fetchTestimonials();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <PageHero
        eyebrow="Real outcomes, verified"
        title="Success Stories"
        subtitle="Results, competition achievements and family stories. Testimonials are published with explicit consent only - no fabricated claims."
        crumbs={[{ name: "Home", href: "/" }, { name: "Success Stories" }]}
        align="center"
      />

      <div className="container-x py-12">
        {/* Verified results */}
        <section className="mt-14 grid gap-5 md:grid-cols-2">
          {RESULTS.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <r.icon size={20} />
              </span>
              <span className="mt-4 inline-block rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-600">
                {r.tag}
              </span>
              <h2 className="mt-3 font-display text-lg tracking-[0.02em] text-brand-navy">
                {r.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {r.body}
              </p>
            </div>
          ))}
        </section>

        {/* Parent stories - consent-gated, live from the API */}
        <section className="mt-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">
            Parent stories
          </p>
          <h2 className="mt-2 font-display text-3xl tracking-[0.02em] text-brand-navy">
            What families say
          </h2>

          {testimonials.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
              <Quote size={24} className="mx-auto text-ink-300" />
              <p className="mt-4 text-sm text-ink-600">
                Parent stories are published here as soon as families give their
                consent.
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-block font-bold text-brand-green hover:underline"
              >
                Share your family&apos;s story →
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <figure
                  key={t.id}
                  className="flex flex-col rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
                >
                  <Quote size={20} className="text-brand-green" />
                  <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-700">
                    &ldquo;{t.body}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
                    <div>
                      <p className="text-sm font-bold text-ink-900">
                        {t.author_name}
                      </p>
                      {t.author_location && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                          <MapPin size={11} /> {t.author_location}
                        </p>
                      )}
                    </div>
                    {t.rating != null && (
                      <span className="rounded-full bg-brand-gold-light px-2.5 py-1 text-xs font-bold text-brand-green">
                        {t.rating.toFixed(1)} ★
                      </span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
