"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminOrder } from "@/features/admin/api";
import { NuvoraReceipt } from "@/components/receipt/NuvoraReceipt";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const q = useQuery({
    queryKey: ["admin", "order", params.orderId],
    queryFn: () => getAdminOrder(params.orderId),
    enabled: !!params.orderId,
  });

  if (q.isLoading) return <p className="p-8 text-ink-500">Loading order…</p>;
  if (q.error || !q.data) {
    return (
      <div className="p-8">
        <p className="text-red-600">Could not load this order.</p>
        <Link href="/admin/payments" className="mt-2 inline-block text-sm font-bold text-brand-gold-dark">
          Back to payments
        </Link>
      </div>
    );
  }

  const { order, items } = q.data;
  const when = new Date(order.created_at);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
        <Link href="/admin/payments" className="hover:text-brand-gold-dark">Payments</Link> / {order.order_number}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-deep">{order.order_number}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {when.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>
        <StatusBadge label={order.status} kind={statusKindFor(order.status)} />
      </div>
      <dl className="grid gap-4 rounded-2xl border border-ink-100 bg-white p-5 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold uppercase text-ink-400">Amount</dt>
          <dd className="text-lg font-extrabold text-ink-900">{order.currency} {order.total_amount.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase text-ink-400">Payer</dt>
          <dd className="text-sm font-semibold text-ink-800">{order.parent_user_id?.slice(0, 8) || "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase text-ink-400">Learner</dt>
          <dd className="text-sm font-semibold text-ink-800">{order.student_profile_id?.slice(0, 8) || "—"}</dd>
        </div>
      </dl>
      <section className="rounded-2xl border border-ink-100 bg-white p-5">
        <h2 className="font-bold text-ink-900">What this payment was for</h2>
        <ul className="mt-3 divide-y divide-ink-50">
          {(items ?? []).map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-semibold text-ink-800">{it.description || "Enrolment"}</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {(it.item_type || "").replace(/_/g, " ")}
                  {it.item_type === "COHORT" ? " · programme cohort" : it.item_type === "PRIVATE_PACKAGE" ? " · private tuition" : ""}
                </span>
              </span>
              <span className="font-bold">{order.currency} {it.total_price.toLocaleString()}</span>
            </li>
          ))}
          {(items ?? []).length === 0 && <li className="py-4 text-sm text-ink-400">No line items on this order.</li>}
        </ul>
      </section>
      {order.status === "PAID" && (
        <div className="print:block">
          <div className="mb-3 flex gap-2 print:hidden">
            <button type="button" onClick={() => window.print()} className="rounded-full bg-deep px-5 py-2 text-sm font-bold text-white">
              Print / Save PDF
            </button>
          </div>
          <NuvoraReceipt
            orderNumber={order.order_number}
            status={order.status}
            createdAt={order.created_at}
            currency={order.currency}
            total={order.total_amount}
            items={items ?? []}
          />
        </div>
      )}
    </div>
  );
}
