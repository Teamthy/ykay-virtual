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
  });

  return (
    <DashboardPage>
      {q.isLoading && <p className="text-ink-500">Loading receipt…</p>}
      {q.error && <p className="text-red-600">This receipt is not available on your account.</p>}
      {q.data && (
        <>
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
