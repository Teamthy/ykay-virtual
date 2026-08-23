"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getOrderReceipt } from "@/features/portal/api";
import { NuvoraReceipt } from "@/components/receipt/NuvoraReceipt";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function ReceiptPage() {
  const params = useParams<{ orderId: string }>();
  const q = useQuery({
    queryKey: ["receipt", params.orderId],
    queryFn: () => getOrderReceipt(params.orderId),
    enabled: !!params.orderId,
    // Payers land here straight from the payment gateway, often before the
    // webhook settles the order. Poll while PENDING so the page flips to
    // PAID on its own (webhook round-trip is the source of truth).
    refetchInterval: (query) =>
      query.state.data?.order.status === "PENDING" ? 5000 : false,
  });

  const status = q.data?.order.status;

  return (
    <DashboardPage>
      {q.isLoading && <p className="text-ink-500">Loading receipt…</p>}
      {q.error && <p className="text-red-600">This receipt is not available on your account.</p>}
      {q.data && (
        <>
          {status === "PENDING" && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              ⏳ Waiting for payment confirmation… this page refreshes automatically.
              If you completed payment, your seat will be confirmed in a moment.
            </div>
          )}
          {(status === "PAID" || status === "COMPLETED") && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              ✅ Payment confirmed — your enrolment is secured. See it in your dashboard.
            </div>
          )}
          {status === "CANCELLED" && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              This order was cancelled. If you were charged, contact support and we will resolve it.
            </div>
          )}
          <div className="mb-4 flex justify-end print:hidden">
            <button type="button" onClick={() => window.print()} className="rounded-full bg-deep px-5 py-2 text-sm font-bold text-white">
              Print / Save PDF
            </button>
          </div>
          <NuvoraReceipt
            orderNumber={q.data.order.order_number}
            status={q.data.order.status}
            createdAt={q.data.order.created_at}
            currency={q.data.order.currency}
            total={q.data.order.total_amount}
            items={q.data.items}
          />
        </>
      )}
    </DashboardPage>
  );
}
