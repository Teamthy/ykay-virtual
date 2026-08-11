import { apiFetchSSR } from "@/lib/api";

// Home testimonials (working-doc §8.1): admin-managed, consent-gated —
// only testimonials with consent_given + is_public are ever shown.

export type Testimonial = {
  id: string;
  author_name: string;
  author_location?: string;
  author_role?: string;
  body: string;
  rating?: number;
  is_featured: boolean;
};

export async function TestimonialsSection() {
  let testimonials: Testimonial[] = [];
  try {
    const res = await apiFetchSSR<Testimonial[]>("/content/testimonials?featured=true");
    testimonials = res.data ?? [];
  } catch {
    testimonials = [];
  }

  if (testimonials.length === 0) {
    return (
      <section className="container-x py-16">
        <div className="text-center max-w-2xl mx-auto">
          <p className="tag-handwritten">In their words</p>
          <h2 className="text-3xl font-extrabold mt-1">What families say</h2>
          <p className="mt-4 text-sm text-ink-500 border border-dashed border-ink-200 rounded-2xl p-6">
            Real stories are published here as families give their consent —{" "}
            <a href="/success-stories" className="text-brand-blue font-semibold hover:underline">see our success stories</a>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16">
      <div className="text-center">
        <p className="tag-handwritten">In their words</p>
        <h2 className="text-3xl font-extrabold mt-1">What families say</h2>
      </div>
      <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {testimonials.slice(0, 6).map((t) => (
          <figure key={t.id} className="border rounded-2xl p-6 bg-white">
            <div className="flex gap-0.5 text-brand-gold">
              {Array.from({ length: t.rating ?? 5 }).map((_, i) => <span key={i}>★</span>)}
            </div>
            <blockquote className="mt-3 text-sm text-ink-700 leading-relaxed">“{t.body}”</blockquote>
            <figcaption className="mt-4 text-xs font-semibold text-ink-500">
              — {t.author_name}
              {t.author_role ? `, ${t.author_role}` : ""}
              {t.author_location ? ` · ${t.author_location}` : ""}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] text-ink-400">
        Published with explicit consent · verified families
      </p>
    </section>
  );
}
