import Link from "next/link";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";
import { hideDemo } from "@/lib/content-filter";
import { CohortCard } from "@/features/cohorts/components/CohortCard";

// Home "Upcoming cohorts" strip (working-doc §8.1): capacity/status,
// schedule, fee, enrol CTA - live from the API.

type Cohort = {
  id: string;
  slug?: string;
  title: string;
  start_date: string;
  end_date: string;
  schedule_description?: string;
  timezone: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  status: string;
};

export async function UpcomingCohorts() {
  let cohorts: Cohort[] = [];
  try {
    const res = await apiFetchSSR<Cohort[]>("/cohorts?page=1&page_size=12");
    cohorts = hideDemo((res.data ?? []).filter((c) => c.status === "PUBLISHED"));
  } catch {
    cohorts = [];
  }

  if (cohorts.length === 0) {
    return (
      <section className="backdrop-brand-peach w-full bg-white py-16">
        <div className="container-x">
        <div className="rounded-2xl border border-dashed border-ink-200 bg-peach p-10 text-center">
          <h2 className="text-2xl font-extrabold">Upcoming cohorts</h2>
          <p className="mt-2 text-sm text-ink-500">
            New term dates are being published. Browse programmes or request private tuition.
          </p>
          <Link href="/programmes" className="btn-gold mt-5 inline-block text-sm">Browse programmes</Link>
        </div>
        </div>
      </section>
    );
  }

  return (
    <section className="backdrop-brand-peach w-full bg-white py-16">
      <div className="container-x">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tag-handwritten">Starting soon</p>
          <h2 className="mt-1 text-3xl font-extrabold text-deep-green">Upcoming cohorts</h2>
        </div>
        <Link href="/cohorts" className="text-sm font-semibold text-deep-green hover:underline">View all cohorts →</Link>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cohorts.slice(0, 6).map((c) => (
          <CohortCard key={c.id} c={c} />
        ))}
      </div>
      </div>
    </section>
  );
}
