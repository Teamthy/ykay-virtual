import Link from "next/link";
import { apiFetchSSR } from "@/lib/api";
import { CohortCard } from "@/features/cohorts/components/CohortCard";

// Home "Upcoming cohorts" strip (working-doc §8.1): capacity/status,
// schedule, fee, enrol CTA — live from the API.

type Cohort = {
  id: string;
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
    const res = await apiFetchSSR<Cohort[]>("/cohorts?page=1&page_size=6");
    cohorts = (res.data ?? []).filter((c) => c.status === "PUBLISHED");
  } catch {
    cohorts = [];
  }

  if (cohorts.length === 0) {
    return (
      <section className="container-x py-16">
        <div className="rounded-2xl border border-dashed border-ink-200 p-8 text-center">
          <h2 className="text-2xl font-extrabold">Upcoming cohorts</h2>
          <p className="mt-2 text-sm text-ink-500">
            New cohorts launch regularly —{" "}
            <Link href="/cohorts" className="text-brand-blue font-semibold hover:underline">see all cohorts</Link> or{" "}
            <Link href="/private-tuition" className="text-brand-blue font-semibold hover:underline">request private tuition</Link>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="tag-handwritten">Starting soon</p>
          <h2 className="text-3xl font-extrabold mt-1">Upcoming cohorts</h2>
        </div>
        <Link href="/cohorts" className="text-sm font-semibold text-brand-blue hover:underline">View all cohorts →</Link>
      </div>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cohorts.map((c) => (
          <CohortCard key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}
