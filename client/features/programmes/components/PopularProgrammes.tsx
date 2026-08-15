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

  // Dummy showcase when the API has no rows yet (dev/preview): real links.
  const dummy: ProgrammeCardData[] = [
    {
      id: "dummy-1", slug: "utme-2026", href: "/utme-2026", title: "UTME 2026 Prep — Score 300+",
      format: "COHORT", curriculum_name: "Nigerian Curriculum", level_name: "SSS2–SSS3",
      subjects: ["Maths", "English", "Physics"], price_min: 35000, currency: "NGN",
      is_featured: true, next_start: "2026-09-07T09:00:00Z",
      summary: "Weekly mock CBT, 200+ practice tests and a ₦20M scholarship pool.",
    },
    {
      id: "dummy-2", slug: "igcse", href: "/online-classes", title: "IGCSE Computer Science",
      format: "ONLINE_CLASS", curriculum_name: "British Curriculum", level_name: "Year 10–11",
      subjects: ["Computer Science"], price_min: 35000, currency: "NGN",
      is_featured: false, next_start: "2026-09-14T09:00:00Z",
      summary: "Structured IGCSE preparation with a certified Computing specialist.",
    },
    {
      id: "dummy-3", slug: "entrance", href: "/entrance-exam", title: "Common Entrance Masterclass",
      format: "BOOTCAMP", curriculum_name: "British & Nigerian", exam_name: "Common Entrance",
      subjects: ["Maths", "English"], price_min: 45000, currency: "NGN",
      is_featured: false, next_start: "2026-10-05T09:00:00Z",
      summary: "Past-paper practice and mock exams for top schools in Nigeria & the UK.",
    },
  ];
  const cards = programmes.length > 0 ? programmes : dummy;

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
