"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAdminOrder } from "@/features/admin/api";
import { YKVirtualReceipt } from "@/components/receipt/YKVirtualReceipt";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const q = useQuery({
    queryKey: ["admin", "order", params.orderId],
    queryFn: () => getAdminOrder(params.orderId),
    enabled: !!params.orderId,
  });

  if (q.isLoading) return <p className="p-8 text-[#0F2A1A]/65">Loading order…</p>;
  if (q.error || !q.data) {
    return (
      <div className="p-8">
        <p className="text-red-600">Could not load this order.</p>
        <Link
          href="/admin/payments"
          className="mt-2 inline-block text-sm font-bold text-[#0F2A1A]"
        >
          Back to payments
        </Link>
      </div>
    );
  }

  const { order, items, payments, payer, student } = q.data;
  const when = new Date(order.created_at);

  return (
    <div className="space-y-6 px-4 py-6 md:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0F2A1A]/65">
        <Link href="/admin/payments" className="hover:text-[#0F2A1A]">
          Payments
        </Link>{" "}
        / {order.order_number}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[#0F2A1A]">
            {order.order_number}
          </h1>
          <p className="mt-1 text-sm text-[#0F2A1A]/65">
            {when.toLocaleString("en-GB", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        </div>
        <StatusBadge label={order.status} kind={statusKindFor(order.status)} />
      </div>
      <dl className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] font-bold uppercase text-[#0F2A1A]/65">
            Amount
          </dt>
          <dd className="text-lg font-extrabold text-[#0F2A1A]">
            {order.currency} {order.total_amount.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase text-[#0F2A1A]/65">
            Payer
          </dt>
          <dd className="text-sm font-semibold text-[#0F2A1A]/85">
            {payer?.name || "—"}
          </dd>
          {payer?.email && (
            <dd className="text-xs text-[#0F2A1A]/65">{payer.email}</dd>
          )}
          {payer?.phone && (
            <dd className="text-xs text-[#0F2A1A]/65">{payer.phone}</dd>
          )}
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase text-[#0F2A1A]/65">
            Learner
          </dt>
          <dd className="text-sm font-semibold text-[#0F2A1A]/85">
            {student?.name || "—"}
          </dd>
          {student?.level && (
            <dd className="text-xs text-[#0F2A1A]/65">{student.level}</dd>
          )}
          {student?.school && (
            <dd className="text-xs text-[#0F2A1A]/65">{student.school}</dd>
          )}
        </div>
      </dl>
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-bold text-[#0F2A1A]">Payment history</h2>
        {(payments ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-[#0F2A1A]/65">
            No payment rows yet — the order is still PENDING.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-ink-50">
            {(payments ?? []).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-[#0F2A1A]/85">
                    {p.provider.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-[#0F2A1A]/65">
                    Ref: {p.provider_reference || "—"} ·{" "}
                    {new Date(p.created_at).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {p.paid_at
                      ? ` · paid ${new Date(p.paid_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">
                    {p.currency} {p.amount.toLocaleString()}
                  </span>
                  <StatusBadge
                    label={p.status}
                    kind={statusKindFor(p.status)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-black/10 bg-white p-5">
        <h2 className="font-bold text-[#0F2A1A]">What this payment was for</h2>
        <ul className="mt-3 divide-y divide-ink-50">
          {(items ?? []).map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-semibold text-[#0F2A1A]/85">
                  {it.description || "Enrolment"}
                </span>
                <span className="mt-0.5 block text-xs text-[#0F2A1A]/65">
                  {(it.item_type || "").replace(/_/g, " ")}
                  {it.item_type === "COHORT"
                    ? " · programme cohort"
                    : it.item_type === "PRIVATE_PACKAGE"
                      ? " · private tuition"
                      : ""}
                </span>
              </span>
              <span className="font-bold">
                {order.currency} {it.total_price.toLocaleString()}
              </span>
            </li>
          ))}
          {(items ?? []).length === 0 && (
            <li className="py-4 text-sm text-[#0F2A1A]/65">
              No line items on this order.
            </li>
          )}
        </ul>
      </section>
      {order.status === "PAID" && (
        <div className="print:block">
          <div className="mb-3 flex gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-[#0F2A1A] px-5 py-2 text-sm font-bold text-white"
            >
              Print / Save PDF
            </button>
          </div>
          <YKVirtualReceipt
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
