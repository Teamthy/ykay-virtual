"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Skeleton } from "@/components/ui/skeleton";
import { unreadCount } from "@/features/messaging/api";
import { ReferralCard } from "@/features/referrals/ReferralCard";
import { listLearners, type Learner } from "@/features/onboarding/api";
import { getAttendanceSummary, getOrderReceipt, type OrderReceipt } from "@/features/portal/api";

// Parent portal (working-doc §10): learner switcher, today/upcoming lessons,
// attendance summary, progress snapshot, payments & receipts, book more
// tuition, message support.

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  created_at: string;
};

type Lesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  status: string;
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-ink-100 text-ink-500",
};

export default function ParentDashboardPage() {
  const { user } = useSession();
  const [selectedLearner, setSelectedLearner] = useState<string>("");
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });

  const activeLearner: Learner | undefined = (learners.data ?? []).find((l) => l.id === selectedLearner) ?? (learners.data ?? [])[0];
  const learnerId = activeLearner?.id ?? "";

  const orders = useQuery({
    queryKey: ["me", "orders"],
    queryFn: async () => {
      const res = await apiFetch<Order[]>("/me/orders");
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const lessons = useQuery({
    queryKey: ["parent", "lessons", learnerId],
    queryFn: async () => {
      const res = await apiFetch<Lesson[]>(`/me/lessons?student_profile_id=${learnerId}`);
      return res.data ?? [];
    },
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const attendance = useQuery({
    queryKey: ["parent", "attendance", learnerId],
    queryFn: () => getAttendanceSummary(learnerId),
    enabled: !!learnerId,
    staleTime: 30_000,
  });

  const unread = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => unreadCount(user?.id ?? ""),
    enabled: !!user,
    staleTime: 15_000,
  });

  const openReceipt = async (orderId: string) => {
    setReceiptLoading(true);
    try {
      const r = await getOrderReceipt(orderId);
      setReceipt(r);
    } finally {
      setReceiptLoading(false);
    }
  };

  const upcoming = (lessons.data ?? []).filter((l) => l.status === "SCHEDULED" || l.status === "ONGOING");
  const nextPayment = (orders.data ?? []).find((o) => o.status === "PENDING");
  const paidCount = (orders.data ?? []).filter((o) => o.status === "PAID").length;

  return (
    <main className="container-x py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Parent dashboard</h1>
          <p className="text-ink-500 text-sm mt-1">Bookings, payments and progress for your family.</p>
        </div>
        {/* Learner switcher */}
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">SELECT LEARNER</span>
          <select
            value={selectedLearner || activeLearner?.id || ""}
            onChange={(e) => setSelectedLearner(e.target.value)}
            className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-blue focus:outline-none"
          >
            {(learners.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
            ))}
            {(learners.data ?? []).length === 0 && <option value="">Add a learner…</option>}
          </select>
        </label>
      </div>

      {!learnerId && (
        <div className="mt-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 p-6 text-sm">
          <strong>No learner linked yet.</strong> Add your first learner to see schedules, attendance and progress.{" "}
          <Link href="/onboarding/learner" className="text-brand-blue font-semibold hover:underline">Add a learner →</Link>
        </div>
      )}

      <div className="mt-8 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {/* Outstanding action / next payment */}
          <section className="rounded-2xl p-6 border">
            <h2 className="font-bold">Outstanding action</h2>
            {nextPayment ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div>
                  <p className="text-sm font-semibold">Payment pending — {nextPayment.order_number}</p>
                  <p className="text-xs text-ink-500">{nextPayment.currency} {nextPayment.total_amount.toLocaleString()}</p>
                </div>
                <a href={`/checkout/${nextPayment.id}`} className="btn-gold text-sm">Complete payment</a>
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-500">All caught up — no outstanding payments. 🎉</p>
            )}
          </section>

          {/* Today / upcoming */}
          <section className="rounded-2xl p-6 border">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{activeLearner ? `${activeLearner.first_name}'s` : ""} lessons</h2>
              <span className="text-xs text-ink-400">{lessons.data?.[0]?.timezone ?? ""}</span>
            </div>
            {!learnerId ? (
              <p className="mt-3 text-sm text-ink-500">Link a learner to see their schedule.</p>
            ) : lessons.isLoading ? (
              <Skeleton className="h-16 w-full mt-3" />
            ) : upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No upcoming lessons.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcoming.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-xl p-4">
                    <div>
                      <div className="font-semibold text-sm">{l.title}</div>
                      <div className="text-xs text-ink-500">
                        {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                      </div>
                    </div>
                    {l.meeting_url && (
                      <a href={l.meeting_url} target="_blank" rel="noreferrer" className="rounded-xl bg-brand-blue text-white text-sm font-bold px-4 py-2">Join class</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Attendance + progress snapshot */}
          <section className="rounded-2xl p-6 border">
            <h2 className="font-bold">Attendance summary</h2>
            {attendance.data ? (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "Present", value: attendance.data.present, cls: "text-green-700" },
                  { label: "Absent", value: attendance.data.absent, cls: "text-red-700" },
                  { label: "Late", value: attendance.data.late, cls: "text-amber-700" },
                  { label: "Rate", value: `${attendance.data.rate.toFixed(0)}%`, cls: "text-brand-blue" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-ink-50 p-3">
                    <div className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</div>
                    <div className="text-[10px] text-ink-500">{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-500">Attendance appears after lessons begin.</p>
            )}
          </section>

          {/* Tutor notes */}
          <section className="rounded-2xl p-6 border">
            <h2 className="font-bold">Recent tutor notes & feedback</h2>
            <p className="mt-2 text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-6 text-center">
              Tutor lesson notes and homework appear here as lessons are delivered.
            </p>
          </section>

          {/* Payments & receipts */}
          <section className="rounded-2xl p-6 border">
            <h2 className="font-bold">Payments & receipts</h2>
            {orders.isLoading ? (
              <Skeleton className="h-16 w-full mt-3" />
            ) : (orders.data?.length ?? 0) === 0 ? (
              <p className="mt-3 text-sm text-ink-500">No payments yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {orders.data?.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2">
                    <div>
                      <span className="font-mono text-xs">{o.order_number}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[o.status] ?? "bg-ink-100"}`}>{o.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm">{o.currency} {o.total_amount.toLocaleString()}</span>
                      <button onClick={() => void openReceipt(o.id)} className="text-xs font-semibold text-brand-blue hover:underline">Receipt</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-blue/5 border border-brand-blue/20 p-4 text-center">
              <div className="text-2xl font-extrabold text-brand-blue">{paidCount}</div>
              <div className="text-[10px] text-ink-500">Paid bookings</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
              <div className="text-2xl font-extrabold text-amber-700">{unread.data ?? 0}</div>
              <div className="text-[10px] text-ink-500">Unread alerts</div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/private-tuition" className="btn-gold text-center text-sm">Book more tuition</Link>
            <Link href="/programmes" className="btn-primary text-center text-sm">Find a programme</Link>
            <Link href="/messages" className="btn-outline border text-center text-sm">Message support</Link>
          </div>
          <ReferralCard userId={user?.id ?? ""} />
        </aside>
      </div>

      {/* Receipt modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setReceipt(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Receipt</h2>
              <button onClick={() => setReceipt(null)} className="text-ink-400 hover:text-ink-700">✕</button>
            </div>
            <div className="rounded-xl bg-ink-50 p-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink-500">Order</span><span className="font-mono text-xs">{receipt.order.order_number}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Status</span><span className="font-semibold">{receipt.order.status}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Date</span><span>{new Date(receipt.order.created_at).toLocaleDateString()}</span></div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2">Items</h3>
              <ul className="space-y-1.5 text-sm">
                {receipt.items.map((it, i) => (
                  <li key={i} className="flex justify-between"><span>{it.description ?? it.item_type.replace(/_/g, " ")} × {it.quantity}</span><span className="font-semibold">{receipt.order.currency} {it.total_price.toLocaleString()}</span></li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-ink-100 pt-2 mt-2 font-bold">
                <span>Total</span><span>{receipt.order.currency} {receipt.order.total_amount.toLocaleString()}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2">Payments</h3>
              <ul className="space-y-1.5 text-xs">
                {receipt.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span className="text-ink-500">{p.provider.replace(/_/g, " ")} {p.provider_reference ? `· ${p.provider_reference.slice(0, 14)}…` : ""}</span>
                    <span className="font-semibold">{p.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
