import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { API_BASE, apiFetchSSR } from "@/lib/server-api";
import Link from "next/link";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Group Cohorts — Scheduled Small-Group Classes | NUVORA",
  description:
    "Join scheduled small-group cohort classes across British and Nigerian curricula, exam preparation and digital skills — with vetted tutors and escrow-protected enrolment.",
  path: "/cohorts",
});

type Cohort = {
  id: string;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  schedule_description?: string;
  timezone: string;
  location_mode: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  status: string;
};

export default async function CohortsPage() {
  let cohorts: Cohort[] = [];
  let total = 0;
  try {
    const res = await apiFetchSSR<Cohort[]>("/cohorts?page=1&page_size=50");
    cohorts = res.data ?? [];
    total = res.meta?.total_items ?? 0;
  } catch {
    cohorts = [];
  }

  return (
    <main className="container-x py-10">
      <PageHero
        eyebrow="Learn together"
        title="Group Cohorts"
        subtitle="Scheduled small-group classes with a vetted tutor — structured sessions, live lessons and a clear schedule. Enrol securely; your fee sits in escrow until the cohort delivers."
        crumbs={[{ name: "Home", href: "/" }, { name: "Group Cohorts" }]}
        align="center"
      />


      <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cohorts.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 border rounded-2xl p-12 text-center text-ink-500">
            No cohorts are open for enrolment right now —{" "}
            <Link href="/programmes" className="text-brand-blue font-semibold hover:underline">
              explore programmes
            </Link>{" "}
            or{" "}
            <Link href="/private-tuition" className="text-brand-blue font-semibold hover:underline">
              request private tuition
            </Link>
            .
          </div>
        ) : (
          cohorts.map((c) => {
            const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
            const full = seatsLeft === 0;
            return (
              <Link
                key={c.id}
                href={`/cohorts/${c.id}`}
                className="border rounded-2xl p-6 hover:shadow-lift hover:border-brand-blue/40 transition-all bg-white"
              >
                <h2 className="font-bold leading-snug">{c.title}</h2>
                <div className="mt-3 space-y-1.5 text-sm text-ink-600">
                  <p>🗓️ {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}</p>
                  <p>🌍 {c.timezone} · {c.location_mode.replace(/_/g, " ").toLowerCase()}</p>
                  {c.schedule_description && <p className="text-xs text-ink-500">{c.schedule_description}</p>}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-extrabold text-brand-blue">
                    {c.currency} {c.fee.toLocaleString()}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${full ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    {full ? "Full" : `${seatsLeft} seats left`}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
      {total > cohorts.length && (
        <p className="mt-6 text-center text-sm text-ink-500">Showing {cohorts.length} of {total} cohorts — more launching soon.</p>
      )}
    </main>
  );
}
