"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listReferrals, type Referral } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <p className="text-[#0F2A1A]/65 text-sm mt-1">Track referred signups, qualifying orders and rewards.</p>
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
              status === s ? "bg-[#0F2A1A] text-white" : "bg-[#F9F6ED] text-[#0F2A1A]/70 hover:bg-[#F9F6ED]"
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
        <EmptyState
          icon={<Inbox size={20} />}
          title="No referrals yet"
          description="Share your code to start earning - qualifying referrals appear here."
        />
      ) : (
        <div className="border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[#F9F6ED] text-left text-xs text-[#0F2A1A]/65">
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
                <tr key={r.id} className="border-t border-black/10 hover:bg-[#F9F6ED]/50">
                  <td className="px-5 py-3 font-mono text-xs">{r.referred_user_id.slice(0, 13)}…</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.referrer_user_id.slice(0, 13)}…</td>
                  <td className="px-5 py-3 font-semibold">₦{r.reward_amount.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <StatusBadge label={r.status} kind={statusKindFor(r.status)} />
                  </td>
                  <td className="px-5 py-3 text-xs text-[#0F2A1A]/65">{new Date(r.created_at).toLocaleDateString()}</td>
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
          <span className="text-sm text-[#0F2A1A]/65 self-center">
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
