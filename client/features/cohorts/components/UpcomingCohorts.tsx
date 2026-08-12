import Link from "next/link";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";
import { CohortCard, type CohortCardData } from "@/features/cohorts/components/CohortCard";

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

  // Dummy showcase when the API has no rows yet (dev/preview): real links.
  if (cohorts.length === 0) {
    const now = Date.now();
    const dummy: CohortCardData[] = [
      {
        id: "dummy-utme", href: "/utme-2026#callback", title: "UTME 2026 Mastery — 320+ Programme",
        start_date: new Date(now + 25 * 864e5).toISOString(), end_date: new Date(now + 145 * 864e5).toISOString(),
        timezone: "Africa/Lagos", location_mode: "ONLINE", capacity: 60, enrolled_count: 41,
        fee: 35000, currency: "NGN", schedule_description: "Live classes Tue/Thu/Sat evenings + weekly mock CBT.",
      },
      {
        id: "dummy-igcse", href: "/online-classes", title: "IGCSE Computer Science — 2026 Cohort",
        start_date: new Date(now + 32 * 864e5).toISOString(), end_date: new Date(now + 200 * 864e5).toISOString(),
        timezone: "Africa/Lagos", location_mode: "ONLINE", capacity: 20, enrolled_count: 12,
        fee: 35000, currency: "NGN", schedule_description: "Small-group live sessions with a certified specialist.",
      },
      {
        id: "dummy-waec", href: "/exam-prep", title: "WAEC Mathematics Intensive",
        start_date: new Date(now + 18 * 864e5).toISOString(), end_date: new Date(now + 100 * 864e5).toISOString(),
        timezone: "Africa/Lagos", location_mode: "HYBRID", capacity: 25, enrolled_count: 17,
        fee: 45000, currency: "NGN", schedule_description: "Rolling enrolment · weekend cohorts · past papers.",
      },
    ];
    return (
      <section className="container-x py-16">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">Starting soon</p>
            <h2 className="font-display mt-1 text-3xl tracking-[0.02em] text-brand-navy">Upcoming cohorts</h2>
          </div>
          <Link href="/cohorts" className="text-sm font-semibold text-brand-blue hover:underline">View all cohorts →</Link>
        </div>
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {dummy.map((c) => (
            <CohortCard key={c.id} c={c} />
          ))}
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
