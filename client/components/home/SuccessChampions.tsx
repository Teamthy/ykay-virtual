import { Quote, MapPin } from "lucide-react";
import { apiFetchSSR } from "@/lib/server-api";

// SuccessChampions - consent-gated learner/parent stories (no fabricated
// names, scores or quotes). Fetches /content/testimonials like the home
// carousel; when none have been consented yet, it renders an honest
// invitation instead of invented champions.

type Testimonial = {
  id: string;
  author_name: string;
  author_location?: string;
  body: string;
  rating?: number;
};

async function fetchStories(): Promise<Testimonial[]> {
  try {
    const res = await apiFetchSSR<Testimonial[]>("/content/testimonials?featured=true");
    return res.data ?? [];
  } catch {
    return [];
  }
}

function isSeedQuote(t: Testimonial): boolean {
  if (/^Parent\s+\d+$/i.test(t.author_name.trim())) return true;
  if (t.body.includes("My daughter improved from average to top of her class")) return true;
  return false;
}

export async function SuccessChampions() {
  const stories = (await fetchStories()).filter((t) => !isSeedQuote(t));

  if (stories.length === 0) {
    return null; // no consented stories yet - don't invent any
  }

  return (
    <section className="bg-white py-16">
      <div className="container-x">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">What families say</p>
          <p className="mt-3 text-ink-600">Real results, published with explicit consent.</p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {stories.slice(0, 3).map((t) => (
            <figure key={t.id} className="flex flex-col rounded-3xl border border-ink-100 bg-surface-muted p-7">
              <Quote size={20} className="text-brand-green" />
              <blockquote className="mt-4 flex-1 text-sm italic leading-relaxed text-ink-700">&ldquo;{t.body}&rdquo;</blockquote>
              <figcaption className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                <div>
                  <p className="text-sm font-bold text-ink-800">{t.author_name}</p>
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
      </div>
    </section>
  );
}
