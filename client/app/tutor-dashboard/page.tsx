"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyProfile } from "@/features/vetting/api";

const DEV_TUTOR = "00000000-0000-0000-0000-0000000000a1";

type Earnings = {
  escrow_holds: { id: string; amount: number; status: string; created_at: string }[];
  payouts: { id: string; amount: number; status: string; processed_at?: string }[];
  held_total: number;
  released_total: number;
  paid_total: number;
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  SUBMITTED: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  INTERVIEW: "bg-blue-100 text-blue-700",
  VERIFICATION: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
  HOLD: "bg-ink-100 text-ink-600",
};

export default function TutorDashboardPage() {
  const profile = useQuery({
    queryKey: ["vetting", "me", DEV_TUTOR],
    queryFn: () => getMyProfile(DEV_TUTOR),
    staleTime: 30_000,
  });

  const earnings = useQuery({
    queryKey: ["me", "earnings", DEV_TUTOR],
    queryFn: async () => {
      const res = await apiFetch<Earnings>("/me/earnings?tutor_profile_id=00000000-0000-0000-0000-000000000001", {
        headers: { "X-User-ID": DEV_TUTOR, "X-User-Roles": "TUTOR" },
      });
      return res.data;
    },
    staleTime: 60_000,
    enabled: false, // requires a real tutor_profile_id; enable once available
  });

  const p = profile.data;

  return (
    <main className="container-x py-10">
      <h1 className="text-3xl font-extrabold">Tutor dashboard</h1>
      <p className="text-ink-500 text-sm mt-1">Your application, earnings and schedule at a glance.</p>

      {profile.isLoading ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          {/* Vetting status */}
          <section className="mt-8 border rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Vetting status</h2>
                {p ? (
                  <>
                    <p className="text-sm text-ink-600 mt-1">
                      {p.display_name} · {p.slug}
                    </p>
                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[p.status] ?? "bg-ink-100"}`}>
                      {p.status}
                    </span>
                  </>
                ) : (
                  <p className="text-sm text-ink-500 mt-1">You haven&apos;t started your application yet.</p>
                )}
              </div>
              <Link href={p ? "/become-tutor" : "/become-tutor"} className="btn-gold text-sm">
                {p ? "Continue application" : "Start application"}
              </Link>
            </div>
          </section>

          {/* Earnings summary (escrow view) */}
          <section className="mt-6 border rounded-2xl p-6">
            <h2 className="font-bold">Earnings (escrow)</h2>
            <p className="text-xs text-ink-500 mt-1">
              Payments are held in escrow until lessons are confirmed, then released weekly.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              {[
                { label: "Held in escrow", value: earnings.data?.held_total ?? 0 },
                { label: "Released", value: earnings.data?.released_total ?? 0 },
                { label: "Paid out", value: earnings.data?.paid_total ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-ink-50 p-4 text-center">
                  <div className="text-2xl font-extrabold">₦{s.value.toLocaleString()}</div>
                  <div className="text-xs text-ink-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-3">
              Live figures appear once your tutor profile is approved and bookings are paid.
            </p>
          </section>

          {/* Quick links */}
          <div className="grid sm:grid-cols-2 gap-3 mt-6">
            <Link href="/messages" className="border rounded-2xl p-5 hover:border-brand-blue transition-all">
              <h3 className="font-bold">Messages</h3>
              <p className="text-xs text-ink-500 mt-1">Conversations with parents and cohorts.</p>
            </Link>
            <Link href="/become-tutor" className="border rounded-2xl p-5 hover:border-brand-blue transition-all">
              <h3 className="font-bold">Vetting portal</h3>
              <p className="text-xs text-ink-500 mt-1">Documents, quiz and application status.</p>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
