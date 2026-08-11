"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { unreadCount } from "@/features/messaging/api";

const DEV_USER = "00000000-0000-0000-0000-0000000000a1";

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-ink-100 text-ink-500",
};

export default function ParentDashboardPage() {
  const orders = useQuery({
    queryKey: ["me", "orders", DEV_USER],
    queryFn: async () => {
      const res = await apiFetch<Order[]>("/me/orders", {
        headers: { "X-User-ID": DEV_USER, "X-User-Roles": "PARENT" },
      });
      return res.data;
    },
    staleTime: 30_000,
  });
  const unread = useQuery({
    queryKey: ["notifications", "unread", DEV_USER],
    queryFn: () => unreadCount(DEV_USER),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const stats = [
    { label: "Active bookings", value: (orders.data ?? []).filter((o) => o.status === "PAID").length },
    { label: "Pending payment", value: (orders.data ?? []).filter((o) => o.status === "PENDING").length },
    { label: "Unread notifications", value: unread.data ?? 0 },
  ];

  return (
    <main className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Parent dashboard</h1>
      <p className="text-ink-500 text-sm mt-1">Bookings, payments and communication for your family.</p>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-3 mt-8">
        {[
          { href: "/tutors", label: "Find a tutor", desc: "Search the vetted marketplace" },
          { href: "/programmes", label: "Browse programmes", desc: "Cohorts, bootcamps & exam prep" },
          { href: "/messages", label: "Messages", desc: `Booking conversations${unread.data ? ` · ${unread.data} unread` : ""}` },
          { href: "/notifications", label: "Notifications", desc: "Payment & booking updates" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="border rounded-2xl p-5 hover:border-brand-blue hover:shadow-lift transition-all">
            <h2 className="font-bold">{l.label}</h2>
            <p className="text-xs text-ink-500 mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-3 mt-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-brand-blue/5 border border-brand-blue/20 p-5 text-center">
            <div className="text-3xl font-extrabold text-brand-blue">{s.value}</div>
            <div className="text-xs text-ink-600 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Orders */}
      <section className="mt-10">
        <h2 className="text-xl font-bold mb-4">Your orders</h2>
        {orders.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (orders.data?.length ?? 0) === 0 ? (
          <div className="border rounded-2xl p-10 text-center text-ink-500">
            No orders yet — <Link href="/tutors" className="text-brand-blue font-semibold">find a tutor</Link> to get started.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-ink-500 text-xs">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.data?.map((o) => (
                  <tr key={o.id} className="border-t border-ink-100">
                    <td className="px-5 py-3 font-mono text-xs">{o.order_number}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[o.status] ?? "bg-ink-100"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      {o.currency} {o.total_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-ink-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
