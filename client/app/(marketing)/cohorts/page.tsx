import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { apiFetchSSR } from "@/lib/server-api";
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

function formatDay(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date to be confirmed";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CohortsPage() {
  let cohorts: Cohort[] = [];
  let total = 0;
  let failed = false;
  try {
    const res = await apiFetchSSR<Cohort[]>("/cohorts?page=1&page_size=50");
    cohorts = res.data ?? [];
    total = res.meta?.total_items ?? 0;
  } catch {
    cohorts = [];
    failed = true;
  }

  return (
    <main>
      <PageHero
        cover="/hero/cohorts.jpg"
        eyebrow="Learn together"
        title="Group Cohorts"
        subtitle="Scheduled small-group classes with a vetted tutor. When a cohort is open, this page shows its real dates, fee and seats — we don't list placeholder classes."
        crumbs={[{ name: "Home", href: "/" }, { name: "Group Cohorts" }]}
        align="center"
        ctas={[
          { label: "Browse programmes", href: "/programmes", primary: true },
          { label: "Request private tuition", href: "/private-tuition" },
        ]}
      />

      <section className="w-full bg-[#F9F6ED] py-14 lg:py-20">
        <div className="container-x">
          {cohorts.length === 0 ? (
            <EmptyCohorts failed={failed} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {cohorts.map((c) => {
                const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
                const full = seatsLeft === 0;
                return (
                  <Link
                    key={c.id}
                    href={`/cohorts/${c.id}`}
                    className="group flex flex-col overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-[0_8px_28px_rgba(15,42,26,0.06)] transition hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,42,26,0.1)]"
                  >
                    <div
                      className="h-36 bg-[#0F2A1A] bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(15,42,26,0.05), rgba(15,42,26,0.45)), url(${coverFor(c.title + c.id)})`,
                      }}
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="line-clamp-2 font-display text-[22px] uppercase leading-[1.05] text-[#0F2A1A]">
                        {c.title}
                      </h2>
                      <div className="mt-3 space-y-1.5 text-[12px] text-[#0F2A1A]/70">
                        <p className="flex items-center gap-1.5">
                          <CalendarDays size={13} className="shrink-0 text-[#0F2A1A]" />
                          {formatDay(c.start_date)} – {formatDay(c.end_date)}
                        </p>
                        <p className="flex items-center gap-1.5">
                          <MapPin size={13} className="shrink-0 text-[#0F2A1A]" />
                          {c.timezone} · {c.location_mode.replace(/_/g, " ").toLowerCase()}
                        </p>
                        {c.schedule_description && (
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-[#0F2A1A]/60">
                            {c.schedule_description}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                        <span className="text-[14px] font-extrabold text-[#0F2A1A]">
                          {c.currency} {c.fee.toLocaleString()}
                        </span>
                        <span className="rounded-full bg-[#D6FF57] px-3 py-1 text-[11px] font-bold text-[#0F2A1A]">
                          {full ? "Full" : `${seatsLeft} seats left`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {total > cohorts.length && (
            <p className="mt-8 text-center text-[13px] text-[#0F2A1A]/60">
              Showing {cohorts.length} of {total} published cohorts.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyCohorts({ failed }: { failed: boolean }) {
  return (
    <div className="mx-auto max-w-3xl rounded-[20px] border border-black/10 bg-white px-6 py-12 text-center shadow-[0_12px_40px_rgba(15,42,26,0.06)] sm:px-12">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/50">
        {failed ? "Catalogue unavailable" : "Nothing open right now"}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] uppercase leading-[0.95] text-[#0F2A1A]">
        {failed ? "We couldn't load cohorts" : "No cohorts are open for enrolment"}
      </h2>
      <p className="mx-auto mt-4 max-w-[48ch] text-[14px] leading-relaxed text-[#0F2A1A]/70">
        {failed
          ? "The catalogue didn't respond. Refresh in a moment — we won't fill this page with sample classes."
          : "When a small-group class is published, it will show here with its real schedule, fee and remaining seats. There is no waitlist count to invent in the meantime."}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/programmes" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">
          Explore programmes <ArrowRight size={14} />
        </Link>
        <Link href="/private-tuition" className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#F9F6ED]">
          Request private tuition
        </Link>
      </div>
    </div>
  );
}
