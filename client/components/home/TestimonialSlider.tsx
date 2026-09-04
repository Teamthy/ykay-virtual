import { apiFetchSSR } from "@/lib/server-api";
import { TestimonialCarousel, type CarouselItem } from "./TestimonialCarousel";

import { AnimatedText } from "@/components/ui/animated-text";
// TestimonialSlider - G5.3: the carousel is fed ONLY by consent-gated
// testimonials (consent_given + is_public, served by /content/testimonials).
// No fixture marketing copy ships here; when nothing consented exists yet,
// an honest empty state links to the success stories.
export async function TestimonialSlider() {
  let items: CarouselItem[] = [];
  try {
    const res = await apiFetchSSR<
      {
        id: string;
        author_name: string;
        author_location?: string;
        body: string;
      }[]
    >("/content/testimonials");
    items = (res.data ?? []).map((t) => ({
      id: t.id,
      text: t.body,
      name: t.author_name,
      location: t.author_location,
    }));
  } catch {
    items = [];
  }

  if (items.length === 0) {
    return (
      <section className="py-24 md:py-28 bg-brand-gold text-center">
        <div className="max-w-2xl mx-auto px-6">
          <AnimatedText
            as="h2"
            className="font-display mb-4 text-3xl tracking-[0.02em] text-brand-navy md:text-4xl"
            text="Parents love YK-Virtual"
          />
          <p className="text-lg text-ink-900 leading-relaxed">
            Real parent stories appear here as families give their consent -{" "}
            <a href="/success-stories" className="font-semibold underline">
              read our success stories
            </a>
            .
          </p>
        </div>
      </section>
    );
  }

  return <TestimonialCarousel items={items} />;
}
