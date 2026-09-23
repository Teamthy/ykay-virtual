import Link from "next/link";
import { apiFetchSSR } from "@/lib/server-api";
import { hideDemo } from "@/lib/content-filter";
import { ArrowRight } from "lucide-react";

type Cohort = {
  id: string;
  slug?: string | null;
  title: string;
  start_date: string;
  end_date: string;
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
    cohorts = hideDemo((res.data ?? []).filter((c) => c.status === "PUBLISHED"));
  } catch {
    cohorts = [];
  }

  const items = cohorts.length ? cohorts.slice(0, 3) : [
    { id: "1", title: "SS3 WASSCE Intensive", start_date: new Date().toISOString(), end_date: new Date().toISOString(), capacity: 30, enrolled_count: 24, fee: 45000, currency: "₦", status: "PUBLISHED" },
    { id: "2", title: "JSS2 British Curriculum", start_date: new Date().toISOString(), end_date: new Date().toISOString(), capacity: 25, enrolled_count: 18, fee: 35000, currency: "₦", status: "PUBLISHED" },
    { id: "3", title: "UTME 2026 Masterclass", start_date: new Date().toISOString(), end_date: new Date().toISOString(), capacity: 40, enrolled_count: 32, fee: 50000, currency: "₦", status: "PUBLISHED" },
  ];

  return (
    <section className="relative w-full overflow-hidden bg-white">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">{"<<"} Cohorts & Live Classes {">>"}</p>
              <h2 className="mt-3 font-display text-[clamp(1.4rem,2.8vw,2.2rem)] leading-[0.95] tracking-[-0.02em] text-[#0F2A1A] uppercase max-w-[20ch]">Structured cohorts starting soon — limited seats</h2>
            </div>
            <Link href="/cohorts" className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-black">
              View all <span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={12} /></span>
            </Link>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {items.map((c) => {
              const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
              const fill = c.capacity ? Math.round((c.enrolled_count / c.capacity) * 100) : 0;
              return (
                <div key={c.id} className="group rounded-[20px] border border-black/10 bg-white p-6 shadow-[0_4px_24px_rgba(15,42,26,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,42,26,0.12)]">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#0F2A1A] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Cohort</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${fill >= 80 ? "bg-red-100 text-red-700" : "bg-[#D6FF57] text-[#0F2A1A]"}`}>{seatsLeft} seats left</span>
                  </div>
                  <h3 className="mt-4 font-display text-[18px] leading-[1.05] text-[#0F2A1A] line-clamp-2">{c.title}</h3>
                  <p className="mt-2 text-[12px] text-[#0F2A1A]/65">{new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}</p>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide">
                      <span className="text-[#0F2A1A]/65">Enrolment</span>
                      <span className="text-[#0F2A1A]">{fill}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-black/10">
                      <div className="h-full rounded-full bg-[#0F2A1A]" style={{ width: `${fill}%` }} />
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                    <span className="text-[16px] font-extrabold text-[#0F2A1A]">{c.currency} {c.fee.toLocaleString()}</span>
                    <Link href={`/cohorts/${c.id}/enroll`} className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A] px-4 py-2 text-[12px] font-bold text-white group-hover:bg-black">
                      Enrol <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
