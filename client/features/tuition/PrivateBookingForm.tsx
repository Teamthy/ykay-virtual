"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { INPUT_CLS } from "@/components/ui/password-input";
import { createPrivateBooking, initiatePayment } from "@/features/bookings/api/create";
import { listLearners } from "@/features/onboarding/api";
import { listSubjects } from "@/features/subjects/api/list";
import { useSession } from "@/hooks/useSession";
import { loginWithReturn } from "@/lib/safe-next";

// Direct private-tuition booking (P1): pick subject/sessions/duration and
// pay via the escrow-protected order flow. Works for the tutor's subjects.
// G1: subject IDs come from the live catalogue - no fixture UUIDs.

export function PrivateBookingForm({
  tutorProfileId,
  subjects,
  defaultRate,
}: {
  tutorProfileId: string;
  subjects: string[];
  defaultRate: number;
}) {
  const router = useRouter();
  const { user } = useSession();
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });
  const catalogue = useQuery({
    queryKey: ["subjects", "catalogue"],
    queryFn: () => listSubjects(),
    staleTime: 300_000,
  });

  const [subject, setSubject] = useState(subjects[0] ?? "Mathematics");
  const [studentId, setStudentId] = useState("");
  const [sessions, setSessions] = useState(10);
  const [duration, setDuration] = useState(60);
  const publishedRate = defaultRate > 0 ? defaultRate : 0;
  const [goals, setGoals] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderId, setOrderId] = useState("");

  if (!user) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white p-6 text-center">
        <p className="text-sm text-[#0F2A1A]/70">Book private lessons with this tutor.</p>
        <button
          type="button"
          onClick={() => router.push(loginWithReturn())}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-[#D6FF57] px-6 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030]"
        >
          Log in to book
        </button>
      </div>
    );
  }

  const submit = async () => {
    const subjectId = (catalogue.data?.data ?? []).find(
      (s) => s.name.toLowerCase() === subject.toLowerCase() || s.slug === subject.toLowerCase()
    )?.id;
    if (!subject || !subjectId || !studentId || sessions < 1) {
      toast.error("Complete all fields - subject, learner and sessions.");
      return;
    }
    if (publishedRate <= 0) {
      toast.error("This tutor has no published session rate yet.");
      return;
    }
    setBusy(true);
    try {
      const idem = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pk-${Date.now()}`;
      const booking = await createPrivateBooking({
        student_id: studentId,
        tutor_profile_id: tutorProfileId,
        subject_id: subjectId,
        total_sessions: sessions,
        session_duration_minutes: duration,
        currency: "NGN",
        goals: goals || undefined,
        idempotency_key: idem,
      });
      const payment = await initiatePayment({
        order_id: booking.order.id,
        provider: "PAYSTACK",
        email: user.email,
        // Gateway sends the payer back to the in-app receipt, which polls
        // until the webhook confirms the order as PAID (tutor secured).
        callback_url: `/receipts/${booking.order.id}`,
      });
      setOrderId(booking.order.id);
      setOrderNumber(payment.order_number);
      setPaymentLink(payment.payment_link);
      toast.success("Order created - complete payment to confirm your tutor");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create your booking");
    } finally {
      setBusy(false);
    }
  };

  if (paymentLink) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-3xl">🔒</p>
        <h3 className="mt-2 font-bold text-[#0F2A1A]">Order {orderNumber} - ready to pay</h3>
        <p className="mt-1 text-sm text-[#0F2A1A]/70">
          Funds are held in escrow until your lessons are delivered. Complete payment to secure your tutor.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a
            href={paymentLink}
            className="rounded-lg bg-[#D6FF57] px-6 py-3 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030]"
          >
            Continue to payment gateway
          </a>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(paymentLink)}
            className="rounded-lg border border-black/10 bg-white px-6 py-3 text-sm font-semibold text-[#0F2A1A]/75 hover:border-black/10"
          >
            Copy payment link
          </button>
        </div>
        {orderId && (
          <p className="mt-3 text-xs text-[#0F2A1A]/65">
            Already paid?{" "}
            <a href={`/receipts/${orderId}`} className="font-semibold text-[#0F2A1A] underline">
              Track your order status
            </a>
          </p>
        )}
      </div>
    );
  }

  const defaultStudent = (learners.data ?? [])[0];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <h3 className="font-display text-lg font-bold text-[#0F2A1A]">Book private lessons</h3>
      <p className="mt-1 text-sm text-[#0F2A1A]/65">Pay per session - escrow-protected until each lesson is delivered.</p>

      <div className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">Subject</label>
            <select className={INPUT_CLS} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">Learner</label>
            <select className={INPUT_CLS} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{defaultStudent ? "Choose a learner…" : "No learners yet"}</option>
              {(learners.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.first_name} {l.last_name}
                </option>
              ))}
            </select>
            {(learners.data ?? []).length === 0 && (
              <p className="mt-1 text-xs text-[#0F2A1A]/65">Add a learner in your dashboard to book for them.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">Sessions</label>
            <input type="number" min={1} max={60} className={INPUT_CLS} value={sessions} onChange={(e) => setSessions(Number(e.target.value))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">Duration per session</label>
            <select className={INPUT_CLS} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[45, 60, 90, 120].map((d) => (
                <option key={d} value={d}>{d} minutes</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">Price per session (₦)</label>
            <p className="rounded-lg border border-black/10 bg-[#F9F6ED] px-3 py-2.5 text-sm font-semibold text-[#0F2A1A]/85">
              {publishedRate > 0 ? `₦${publishedRate.toLocaleString()} (tutor's published rate)` : "Not published"}
            </p>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">
            Learning goals <span className="font-normal text-[#0F2A1A]/65">(optional)</span>
          </label>
          <textarea
            rows={3}
            className={INPUT_CLS + " h-auto min-h-20 resize-y"}
            placeholder="e.g. prepare for UTME maths, weak on algebra…"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </div>
        <div className="rounded-xl bg-[#F9F6ED] px-4 py-3 text-sm text-[#0F2A1A]/70">
          Estimated total: <span className="font-extrabold text-[#0F2A1A]">₦{(sessions * publishedRate).toLocaleString()}</span> for {sessions}{" "}
          {duration}-minute sessions. Final amount is set by the server.
        </div>
        <button
          type="button"
          disabled={busy || publishedRate <= 0}
          onClick={() => void submit()}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#D6FF57] px-4 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030] disabled:opacity-50"
        >
          {busy ? "Creating order…" : `Book ${sessions} sessions · ₦${(sessions * publishedRate).toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
