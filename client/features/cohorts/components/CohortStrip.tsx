import Link from "next/link";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";

type Cohort = {
  id: string;
  title: string;
  start_date: string;
  timezone: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  status: string;
};

// "Featured cohorts" strip for curriculum and exam-prep landings.
export async function CohortStrip({ title = "Featured cohorts" }: { title?: string }) {
  let cohorts: Cohort[] = [];
  try {
    const res = await apiFetchSSR<Cohort[]>("/cohorts?page=1&page_size=3");
    cohorts = (res.data ?? []).filter((c) => c.status === "PUBLISHED");
  } catch {
    cohorts = [];
  }
  if (cohorts.length === 0) return null;

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <Link href="/cohorts" className="text-sm font-semibold text-brand-blue hover:underline">All cohorts →</Link>
      </div>
      <div className="mt-6 grid md:grid-cols-3 gap-4">
        {cohorts.map((c) => {
          const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
          return (
            <div key={c.id} className="border rounded-2xl p-5">
              <h3 className="font-bold text-sm">{c.title}</h3>
              <p className="mt-1.5 text-xs text-ink-500">
                Starts {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {c.timezone}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-ink-600">{seatsLeft > 0 ? `${seatsLeft} seats left` : "Full"}</span>
                <span className="font-extrabold text-brand-blue text-sm">{c.currency} {c.fee.toLocaleString()}</span>
              </div>
              <Link href={seatsLeft > 0 ? `/cohorts/${c.id}/enroll` : `/cohorts/${c.id}`}
                className={`mt-3 block text-center rounded-xl py-2.5 text-sm font-bold ${seatsLeft > 0 ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "bg-ink-100 text-ink-400"}`}>
                {seatsLeft > 0 ? "Enrol now" : "View cohort"}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
