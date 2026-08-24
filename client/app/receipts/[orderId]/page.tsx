"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { getOrderReceipt, verifyOrder } from "@/features/portal/api";
import { NuvoraReceipt } from "@/components/receipt/NuvoraReceipt";
import { DashboardPage } from "@/components/dashboard/DashboardPage";

export default function ReceiptPage() {
  const params = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);
  const autoVerified = useRef(false);

  const q = useQuery({
    queryKey: ["receipt", params.orderId],
    queryFn: () => getOrderReceipt(params.orderId),
    enabled: !!params.orderId,
    // Payers land here straight from the payment gateway, often before the
    // webhook settles the order. Poll while PENDING so the page flips to
    // PAID on its own (webhook round-trip is the source of truth).
    refetchInterval: (query) =>
      query.state.data?.order.status === "PENDING" ? 4000 : false,
  });

  const status = q.data?.order.status;

  // F-3: the moment a PENDING receipt renders, ask the API to verify against
  // the gateway directly — don't sit waiting for a possibly-lost webhook.
  // Idempotent: if the webhook already settled the order, the server skips
  // the gateway call and returns the paid status immediately.
  useEffect(() => {
    if (status !== "PENDING" || autoVerified.current || !params.orderId) return;
    autoVerified.current = true;
    void (async () => {
      try {
        await verifyOrder(params.orderId);
        await queryClient.invalidateQueries({ queryKey: ["receipt", params.orderId] });
      } catch {
        /* gateway hiccup — 4s polling continues as the fallback */
      }
    })();
  }, [status, params.orderId, queryClient]);

  async function confirmNow() {
    if (!params.orderId || verifying) return;
    setVerifying(true);
    try {
      await verifyOrder(params.orderId);
      await queryClient.invalidateQueries({ queryKey: ["receipt", params.orderId] });
    } catch {
      /* network hiccup — polling continues; the user can retry */
    } finally {
      setVerifying(false);
    }
  }

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
              <span className="mt-2 block font-normal">
                Paid and still waiting?{" "}
                <button
                  type="button"
                  onClick={() => void confirmNow()}
                  disabled={verifying}
                  className="font-bold text-brand-navy underline disabled:opacity-50"
                >
                  {verifying ? "Checking with the gateway…" : "Confirm payment now"}
                </button>
              </span>
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
