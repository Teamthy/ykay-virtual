"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

// ReferralCard — share your code, track referred signups and rewards.
// Every qualified referral credits the referrer's wallet (₦2,000).

type ReferralInfo = {
  code: string;
  is_active: boolean;
  reward: number;
  currency: string;
  share_link: string;
};

type ReferralRow = {
  id: string;
  referred_user_id: string;
  reward_amount: number;
  status: string;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  QUALIFIED: "bg-blue-100 text-blue-700",
  REWARDED: "bg-green-100 text-green-700",
  EXPIRED: "bg-ink-100 text-ink-400",
};

export function ReferralCard({ userId }: { userId: string }) {
  const info = useQuery({
    queryKey: ["referral", "code", userId],
    queryFn: async () => {
      const res = await apiFetch<ReferralInfo>("/me/referral-code");
      return res.data;
    },
    staleTime: 60_000,
  });

  const mine = useQuery({
    queryKey: ["referral", "mine", userId],
    queryFn: async () => {
      const res = await apiFetch<ReferralRow[]>("/me/referrals");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const copy = async () => {
    const link = `${window.location.origin}/r/${info.data?.code ?? ""}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!", { description: "Share it with friends and family." });
    } catch {
      toast.error("Could not copy — please copy the code manually.");
    }
  };

  const rewarded = (mine.data ?? []).filter((r) => r.status === "REWARDED").length;

  return (
    <div className="border rounded-2xl p-6">
      <h2 className="font-bold">Refer & earn ₦{info.data?.reward ?? 2000}</h2>
      <p className="text-xs text-ink-500 mt-1">
        When a friend signs up with your code and pays for their first order, the reward lands in
        your wallet.
      </p>

      {info.isLoading ? (
        <Skeleton className="h-12 w-full mt-4" />
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-brand-blue/10 border border-brand-blue/30 px-5 py-3 font-mono text-lg font-extrabold tracking-widest text-brand-blue">
            {info.data?.code}
          </span>
          <button onClick={() => void copy()} className="btn-gold text-sm">
            Copy share link
          </button>
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-ink-50 p-3">
          <div className="text-xl font-extrabold text-brand-blue">{(mine.data ?? []).length}</div>
          <div className="text-[10px] text-ink-500">Invited</div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3">
          <div className="text-xl font-extrabold text-brand-blue">{(mine.data ?? []).filter((r) => r.status === "QUALIFIED").length}</div>
          <div className="text-[10px] text-ink-500">Qualified</div>
        </div>
        <div className="rounded-xl bg-green-50 p-3">
          <div className="text-xl font-extrabold text-green-700">{rewarded}</div>
          <div className="text-[10px] text-ink-500">Rewarded</div>
        </div>
      </div>

      {(mine.data ?? []).length > 0 && (
        <ul className="mt-5 space-y-2">
          {(mine.data ?? []).slice(0, 5).map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm border-b border-ink-100 pb-2">
              <span className="font-mono text-xs text-ink-500">{(r.referred_user_id ?? "").slice(0, 13)}…</span>
              <span className="flex items-center gap-2">
                <span className="font-semibold">₦{r.reward_amount.toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status] ?? "bg-ink-100"}`}>
                  {r.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
