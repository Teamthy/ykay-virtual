import Link from "next/link";
import { apiFetchSSR } from "@/lib/api";

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
        {cohorts.map((c) => {
          const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
          const full = seatsLeft === 0;
          return (
            <div key={c.id} className="border rounded-2xl p-6 bg-white flex flex-col">
              <h3 className="font-bold leading-snug">{c.title}</h3>
              <p className="mt-2 text-xs text-ink-500">
                {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} →{" "}
                {new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}{c.timezone}
              </p>
              {c.schedule_description && <p className="mt-1.5 text-xs text-ink-500 line-clamp-2">{c.schedule_description}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${full ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                  {full ? "Full" : `${seatsLeft} of ${c.capacity} seats left`}
                </span>
                <span className="font-extrabold text-brand-blue">{c.currency} {c.fee.toLocaleString()}</span>
              </div>
              <Link
                href={full ? "/cohorts" : `/cohorts/${c.id}/enroll`}
                className={`mt-4 text-center rounded-xl py-3 text-sm font-bold transition-all ${
                  full ? "bg-ink-100 text-ink-400 cursor-not-allowed" : "bg-brand-blue text-white hover:bg-brand-blue/90"
                }`}
              >
                {full ? "Cohort full" : "Enrol now"}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
