import { apiFetchSSR } from "@/lib/server-api";
import { TestimonialCarousel, type CarouselItem } from "./TestimonialCarousel";

export async function TestimonialSlider() {
  let items: CarouselItem[] = [];
  try {
    const res = await apiFetchSSR<{ id: string; author_name: string; author_location?: string; body: string }[]>("/content/testimonials");
    items = (res.data ?? []).map((t) => ({ id: t.id, text: t.body, name: t.author_name, location: t.author_location }));
  } catch {
    items = [];
  }

  if (items.length === 0) {
    return (
      <section className="relative w-full overflow-hidden bg-[#F9F6ED]">
        <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 lg:py-20">
          <div className="mx-auto max-w-[900px] text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/50">{"<<"} Parent Stories {">>"}</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.9] text-[#0F2A1A] uppercase">Parents love YK-Virtual</h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#0F2A1A]/70">
              Real parent stories appear here as families give consent — <a href="/success-stories" className="font-bold underline text-[#0F2A1A]">read success stories</a>.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <TestimonialCarousel items={items} />;
}
