"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listReferrals, type Referral } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  QUALIFIED: "bg-blue-100 text-blue-700",
  REWARDED: "bg-green-100 text-green-700",
  EXPIRED: "bg-ink-100 text-ink-400",
};

export default function AdminReferralsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const referrals = useQuery({
    queryKey: ["admin", "referrals", status, page],
    queryFn: () => listReferrals({ status: status || undefined, page }),
    staleTime: 30_000,
  });

  const data = referrals.data?.data ?? [];
  const meta = referrals.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Referral programme</h1>
        <p className="text-ink-500 text-sm mt-1">Track referred signups, qualifying orders and rewards.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "PENDING", "QUALIFIED", "REWARDED", "EXPIRED"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {referrals.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : data.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center text-ink-500">
          No referrals yet — share your code to start earning.
        </div>
      ) : (
        <div className="border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Referred user</th>
                <th className="px-5 py-3 font-semibold">Referrer</th>
                <th className="px-5 py-3 font-semibold">Reward</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r: Referral) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-mono text-xs">{r.referred_user_id.slice(0, 13)}…</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.referrer_user_id.slice(0, 13)}…</td>
                  <td className="px-5 py-3 font-semibold">₦{r.reward_amount.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[r.status] ?? "bg-ink-100"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-ink-500">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span className="text-sm text-ink-500 self-center">
            Page {meta.page} / {meta.total_pages}
          </span>
          <Button size="sm" variant="outline" disabled={!meta.has_next} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
