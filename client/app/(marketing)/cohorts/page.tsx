import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { apiFetchSSR } from "@/lib/server-api";
import Link from "next/link";
import { coverFor } from "@/lib/covers";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Group Cohorts - Scheduled Small-Group Classes | YK-Virtual",
  description:
    "Join scheduled small-group cohort classes across British and Nigerian curricula, exam preparation and digital skills - with vetted tutors and escrow-protected enrolment.",
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
    <main>
      <PageHero
        cover="/hero/cohorts.jpg"
        eyebrow="Learn together"
        title="Group Cohorts"
        subtitle="Scheduled small-group classes with a vetted tutor - structured sessions, live lessons and a clear schedule. Enrol securely; your fee sits in escrow until the cohort delivers."
        crumbs={[{ name: "Home", href: "/" }, { name: "Group Cohorts" }]}
        align="center"
      />

      <div className="container-x mt-10 grid gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
        {cohorts.length === 0 ? (
          <div className="rounded-2xl border p-12 text-center text-ink-500 md:col-span-2 lg:col-span-3">
            No cohorts are open for enrolment right now -{" "}
            <Link
              href="/programmes"
              className="font-semibold text-brand-blue hover:underline"
            >
              explore programmes
            </Link>{" "}
            or{" "}
            <Link
              href="/private-tuition"
              className="font-semibold text-brand-blue hover:underline"
            >
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
                className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft"
              >
                <div
                  className="h-24 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(6,15,38,0.1), rgba(6,15,38,0.55)), url(${coverFor(c.title + c.id)})`,
                  }}
                />
                <div className="p-4">
                  <h2 className="line-clamp-2 text-base font-semibold leading-snug text-brand-navy">
                    {c.title}
                  </h2>
                  <div className="mt-2 space-y-1 text-xs text-ink-600">
                    <p>
                      🗓️ {new Date(c.start_date).toLocaleDateString()} →{" "}
                      {new Date(c.end_date).toLocaleDateString()}
                    </p>
                    <p className="line-clamp-1">
                      🌍 {c.timezone} ·{" "}
                      {c.location_mode.replace(/_/g, " ").toLowerCase()}
                    </p>
                    {c.schedule_description && (
                      <p className="line-clamp-2 text-[11px] text-ink-500">
                        {c.schedule_description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-brand-blue">
                      {c.currency} {c.fee.toLocaleString()}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        full
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {full ? "Full" : `${seatsLeft} seats left`}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      {total > cohorts.length && (
        <p className="container-x pb-10 text-center text-sm text-ink-500">
          Showing {cohorts.length} of {total} cohorts - more launching soon.
        </p>
      )}
    </main>
  );
}
