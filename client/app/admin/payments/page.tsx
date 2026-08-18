"use client";

import Link from "next/link";
import { loginWithReturn } from "@/lib/safe-next";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { INPUT_CLS } from "@/components/ui/password-input";
import {
  listAdminOrders,
  listAdminPayouts,
  confirmManualPayment,
  refundOrder,
} from "@/features/admin/api";
import { useSession } from "@/hooks/useSession";

// Admin payments console (P1): orders + confirm/refund + payouts.

export default function AdminPaymentsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();
  const [page, setPage] = useState(1);
  const [refundFor, setRefundFor] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  const orders = useQuery({
    queryKey: ["admin", "payments", "orders", page],
    queryFn: () => listAdminOrders(page, 25),
  });
  const payouts = useQuery({ queryKey: ["admin", "payments", "payouts"], queryFn: () => listAdminPayouts() });

  const confirm = useMutation({
    mutationFn: (orderId: string) => confirmManualPayment(orderId, "Manual confirmation (admin)"),
    onSuccess: () => {
      toast.success("Payment confirmed - enrollment secured");
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not confirm"),
  });

  const refund = useMutation({
    mutationFn: () => refundOrder(refundFor!, refundReason || "Refund requested"),
    onSuccess: () => {
      toast.success("Order refunded - escrow returned to the parent wallet");
      setRefundFor(null);
      setRefundReason("");
      qc.invalidateQueries({ queryKey: ["admin", "payments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refund"),
  });

  const pendingCount = (orders.data?.orders ?? []).filter((o) => o.status === "PENDING").length;
  const paidCount = (orders.data?.orders ?? []).filter((o) => o.status === "PAID").length;
  const total = orders.data?.total ?? 0;

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/admin" className="hover:text-brand-gold-dark">Admin</Link> / Payments
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">Payments console</h1>
          <p className="mt-1 text-sm text-ink-500">
            {total} orders · {pendingCount} pending · {paidCount} paid on this page
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Orders */}
        <section className="rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="font-display text-lg font-bold text-brand-navy">Orders</h2>
          </div>
          {orders.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (orders.data?.orders ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders.data?.orders ?? []).map((o) => (
                    <tr key={o.id} className="border-b border-ink-50 last:border-0 hover:bg-[#FFF7E4]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink-800">{o.order_number}</p>
                        <p className="text-xs text-ink-400">{o.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge label={o.status} kind={statusKindFor(o.status)} />
                      </td>
                      <td className="px-3 py-3 font-semibold text-ink-800">
                        ₦{o.total_amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-ink-500">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          {o.status === "PENDING" && (
                            <button
                              type="button"
                              disabled={confirm.isPending}
                              onClick={() => confirm.mutate(o.id)}
                              className="rounded-lg bg-brand-gold px-3 py-1.5 text-xs font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                            >
                              Confirm payment
                            </button>
                          )}
                          {o.status === "PAID" && (
                            <button
                              type="button"
                              onClick={() => setRefundFor(o.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:border-red-300"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3 text-sm text-ink-500">
            <span>Page {page}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-bold disabled:opacity-40">
                ← Prev
              </button>
              <button type="button" disabled={(orders.data?.orders ?? []).length < 25} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-bold disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        </section>

        {/* Payouts */}
        <section className="mt-6 rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="font-display text-lg font-bold text-brand-navy">Tutor payouts</h2>
          </div>
          {(payouts.data ?? []).length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">No payouts yet - released escrow generates them on the payout schedule.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-5 py-3">Payout</th>
                    <th className="px-3 py-3">Tutor</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(payouts.data ?? []).map((p) => (
                    <tr key={p.id} className="border-b border-ink-50 last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-ink-500">{p.id.slice(0, 8)}…</td>
                      <td className="px-3 py-3 text-ink-600">{p.tutor_profile_id.slice(0, 8)}…</td>
                      <td className="px-3 py-3 font-semibold text-ink-800">₦{p.amount.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", p.status === "PAID" ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500")}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Refund modal */}
      {refundFor && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-brand-navy">Refund order</h3>
            <p className="mt-1 text-sm text-ink-500">
              Escrow is returned to the parent&apos;s wallet and the order is marked refunded.
            </p>
            <input
              type="text"
              placeholder="Reason (e.g. duplicate charge, tutor unavailable)"
              className={cn(INPUT_CLS, "mt-4")}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={refund.isPending}
                onClick={() => refund.mutate()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
              >
                {refund.isPending ? "Refunding…" : "Refund order"}
              </button>
              <button
                type="button"
                onClick={() => setRefundFor(null)}
                className="flex-1 rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
