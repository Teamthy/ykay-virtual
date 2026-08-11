"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { API_BASE } from "@/lib/api";
import { getAnalytics } from "@/features/learning/api";

// Admin analytics (working-doc §13): enrolment funnel, cohort fill rates,
// revenue by programme — with CSV exports.

const FUNNEL_STEPS = [
  { key: "registered_users", label: "Registered users" },
  { key: "learners_created", label: "Learner profiles" },
  { key: "orders_created", label: "Orders created" },
  { key: "paid_orders", label: "Paid orders" },
  { key: "enrollments_confirmed", label: "Enrolments confirmed" },
] as const;

function fmtMoney(n: number) {
  return n.toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
}

export default function AdminAnalyticsPage() {
  const analytics = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: getAnalytics,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  if (analytics.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const data = analytics.data;
  if (!data) {
    return <p className="text-ink-500">Analytics unavailable.</p>;
  }

  const maxFunnel = Math.max(...FUNNEL_STEPS.map((s) => data.funnel[s.key] ?? 0), 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold">Learning analytics</h1>
          <p className="text-sm text-ink-500 mt-1">
            Enrolment funnel, cohort fill and revenue — conversion{" "}
            <b>{data.funnel.conversion_rate.toFixed(1)}%</b>.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`${API_BASE}/admin/reports/attendance.csv?lesson_id=00000000-0000-0000-0000-000000000010`}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-ink-50"
          >
            ⬇ Attendance CSV
          </a>
          <a
            href={`${API_BASE}/admin/reports/revenue.csv`}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            ⬇ Revenue CSV
          </a>
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Enrolment funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {FUNNEL_STEPS.map((s, i) => {
            const v = data.funnel[s.key] ?? 0;
            const pct = Math.max((v / maxFunnel) * 100, v > 0 ? 4 : 0);
            const prev = i > 0 ? data.funnel[FUNNEL_STEPS[i - 1].key] ?? 0 : 1;
            const stepRate = i === 0 ? 100 : prev > 0 ? Math.round((v / prev) * 100) : 0;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-ink-500">
                    <b className="text-ink-900">{v.toLocaleString()}</b>
                    {i > 0 && <span className="ml-2 text-xs">({stepRate}% of previous)</span>}
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-blue transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Cohort fill */}
        <Card>
          <CardHeader>
            <CardTitle>Cohort fill rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.cohorts.length === 0 && <p className="text-sm text-ink-500">No cohorts yet.</p>}
            {data.cohorts.map((c) => (
              <div key={c.cohort_id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-ink-500">
                    {c.enrolled}/{c.capacity} · {Math.round(c.fill_rate * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full ${c.fill_rate >= 0.8 ? "bg-green-500" : c.fill_rate >= 0.5 ? "bg-amber-500" : "bg-red-400"}`}
                    style={{ width: `${Math.min(c.fill_rate * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by programme</CardTitle>
          </CardHeader>
          <CardContent>
            {data.revenue.length === 0 && <p className="text-sm text-ink-500">No paid orders yet.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ink-400">
                  <th className="pb-2 font-semibold">Programme</th>
                  <th className="pb-2 text-right font-semibold">Orders</th>
                  <th className="pb-2 text-right font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.map((r) => (
                  <tr key={r.programme_id} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{r.programme_title || r.programme_id.slice(0, 8)}</td>
                    <td className="py-2.5 text-right text-ink-500">{r.orders}</td>
                    <td className="py-2.5 text-right font-bold">{fmtMoney(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
