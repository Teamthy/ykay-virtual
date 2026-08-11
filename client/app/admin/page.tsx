"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getAdminStats } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-brand-blue text-white border-brand-blue" : "bg-white"}`}>
      <div className={`text-2xl font-extrabold ${accent ? "text-white" : "text-brand-blue"}`}>{value}</div>
      <div className={`text-xs mt-1 ${accent ? "text-white/80" : "text-ink-500"}`}>{label}</div>
      {sub && <div className={`text-[10px] mt-1 ${accent ? "text-white/60" : "text-ink-400"}`}>{sub}</div>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
    staleTime: 60_000,
  });

  if (stats.isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const s = stats.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Operations overview</h1>
        <p className="text-ink-500 text-sm mt-1">Live platform health at a glance.</p>
      </div>

      {/* People */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">People</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Registered users" value={s?.users.toLocaleString() ?? "–"} sub={`${s?.active_users.toLocaleString()} active`} />
          <StatCard label="Tutors (total)" value={s?.tutors_total.toLocaleString() ?? "–"} />
          <StatCard label="Approved tutors" value={s?.tutors_approved.toLocaleString() ?? "–"} accent />
          <StatCard label="Pending vetting" value={s?.tutors_pending.toLocaleString() ?? "–"} />
        </div>
      </section>

      {/* Money */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">Money</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Orders (total)" value={s?.orders_total.toLocaleString() ?? "–"} />
          <StatCard label="Paid orders" value={s?.orders_paid.toLocaleString() ?? "–"} />
          <StatCard label="Held in escrow" value={`₦${(s?.revenue_in_escrow ?? 0).toLocaleString()}`} accent />
          <StatCard label="Paid out to tutors" value={`₦${(s?.revenue_paid_out ?? 0).toLocaleString()}`} />
        </div>
      </section>

      {/* Content & ops */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-3">Content & operations</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/blog" className="block">
            <StatCard label="Published posts" value={s?.blog_published.toLocaleString() ?? "–"} sub={`${s?.blog_drafts.toLocaleString()} drafts`} />
          </Link>
          <Link href="/admin/institutions" className="block">
            <StatCard label="Institutions (B2B)" value={s?.institutions.toLocaleString() ?? "–"} />
          </Link>
          <Link href="/admin/referrals" className="block">
            <StatCard label="Referrals" value={s?.referrals.toLocaleString() ?? "–"} />
          </Link>
          <Link href="/admin/reviews" className="block">
            <StatCard label="Reviews pending" value={s?.reviews_pending.toLocaleString() ?? "–"} />
          </Link>
        </div>
      </section>

      {/* Attention needed */}
      {(s?.support_open ?? 0) > 0 || (s?.escrow_disputed ?? 0) > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-800">Needs attention</h2>
          <ul className="mt-2 text-sm text-amber-800 list-disc pl-5">
            {s?.support_open ? <li>{s.support_open} open support ticket(s)</li> : null}
            {s?.escrow_disputed ? <li>{s.escrow_disputed} disputed escrow hold(s)</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
