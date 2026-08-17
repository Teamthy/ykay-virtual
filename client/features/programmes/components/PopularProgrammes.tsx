import Link from "next/link";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";
import { hideDemo } from "@/lib/content-filter";
import { ProgrammeCard, type ProgrammeCardData } from "@/features/programmes/components/ProgrammeCard";

// Home "Popular programmes" (working-doc §8.1): featured first, cards with
// curriculum/level/subject/format/next start + CTA.
export async function PopularProgrammes() {
  let programmes: ProgrammeCardData[] = [];
  try {
    const res = await apiFetchSSR<ProgrammeCardData[]>("/programmes?page=1&page_size=12&sort=newest");
    programmes = hideDemo(res.data ?? []);
  } catch {
    programmes = [];
  }

  const cards = programmes;

  if (cards.length === 0) {
    return (
      <section className="container-x py-16">
        <div className="rounded-2xl border border-dashed border-ink-200 p-10 text-center">
          <h2 className="text-2xl font-extrabold">Popular programmes</h2>
          <p className="mt-2 text-sm text-ink-500">Programmes are being finalised for the new term — check back soon or request private tuition.</p>
          <Link href="/private-tuition" className="btn-gold mt-5 inline-block text-sm">Request private tuition</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="tag-handwritten">Start learning</p>
          <h2 className="text-3xl font-extrabold mt-1">Popular programmes</h2>
        </div>
        <Link href="/programmes" className="text-sm font-semibold text-brand-blue hover:underline">Browse all programmes →</Link>
      </div>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((p) => <ProgrammeCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}
