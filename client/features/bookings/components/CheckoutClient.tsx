"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, ShieldCheck, RefreshCcw } from "lucide-react";
import { qk } from "@/lib/queryClient";
import { loginWithReturn } from "@/lib/safe-next";
import { createCohortBooking, initiatePayment, validateCoupon, type CouponValidation } from "@/features/bookings/api/create";
import { verifyOrder } from "@/features/portal/api";
import { abVariant } from "@/lib/ab";
import { trackEvent } from "@/lib/analytics";
import { listLearners } from "@/features/onboarding/api";
import { useSession } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { enrollmentWindow, type Cohort } from "@/features/cohorts/api/get";
import type { BookingResponse, InitiatePaymentResponse, Order, PaymentProvider } from "@/features/bookings/types";

// Zod schema — client + server validation parity (AGENTS.md).
// G1: the paying parent is the session user (server-derived); the learner is
// picked from the parent's linked learners.
const checkoutSchema = z.object({
  student_id: z.string().uuid("Select the learner you are enrolling"),
  email: z.string().email("A valid email is required"),
  provider: z.enum(["PAYSTACK", "FLUTTERWAVE"]),
});

type CheckoutValues = z.infer<typeof checkoutSchema>;

type Step =
  | { name: "form" }
  | { name: "creating" }
  | { name: "error"; message: string }
  | { name: "initiating" }
  | { name: "link"; booking: BookingResponse; payment: InitiatePaymentResponse };

export function CheckoutClient({ cohort }: { cohort: Cohort }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });
  const [step, setStep] = useState<Step>({ name: "form" });
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ck-${Date.now()}`
  );
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  const createBooking = useMutation({
    mutationFn: createCohortBooking,
    onSuccess: (res) => {
      // Optimistic cache write so a bookings view reflects this order immediately.
      queryClient.setQueryData<Order[]>(qk.bookings.all, (old) => [res.order, ...(old ?? [])]);
      queryClient.setQueryData(qk.orders.byNumber(res.order.order_number), res.order);
    },
  });

  const payMutation = useMutation({
    mutationFn: initiatePayment,
    onSuccess: (res) => {
      queryClient.setQueryData(qk.orders.byNumber(res.order_number), (old?: Order) =>
        old ? { ...old, status: "PENDING" as const } : old
      );
    },
  });

  const form = useForm({
    defaultValues: {
      student_id: "",
      email: "",
      provider: "PAYSTACK" as PaymentProvider,
    },
    validators: {
      onChange: ({ value }) => {
        const res = checkoutSchema.safeParse(value);
        return res.success ? undefined : (res.error.issues[0]?.message ?? "Invalid form");
      },
      onSubmit: ({ value }) => {
        const res = checkoutSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      const ab = abVariant("checkout-copy");
      trackEvent("begin_checkout", { ab, cohort: cohort.id });
      setStep({ name: "creating" });
      try {
        const booking = await createBooking.mutateAsync({
          cohort_id: cohort.id,
          student_id: value.student_id,
          idempotency_key: idempotencyKey,
          coupon_code: couponResult?.code ?? undefined,
        });
        if (!booking.payment_required) {
          setStep({ name: "error", message: "This booking was already paid — please check your dashboard." });
          return;
        }
        setStep({ name: "initiating" });
        const payment = await payMutation.mutateAsync({
          order_id: booking.order.id,
          provider: value.provider,
          email: value.email,
          // Gateway sends the payer back to the in-app receipt, which polls
          // until the webhook confirms the order as PAID.
          callback_url: `/receipts/${booking.order.id}`,
        });
        setStep({ name: "link", booking, payment });
        trackEvent("payment_link", { ab, provider: payment.provider });
        toast.success("Order created — opening the payment page");
        if (payment.payment_link) {
          window.location.assign(payment.payment_link);
        }
      } catch (err) {
        setStep({
          name: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        });
      }
    },
  });


  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const res = await validateCoupon(couponCode.trim(), cohort.fee);
      setCouponResult(res);
      toast.success(`Coupon applied: ${res.currency} ${res.discount.toLocaleString()} off`);
    } catch (e) {
      setCouponResult(null);
      setCouponError(e instanceof Error ? e.message : "That coupon isn't valid for this order.");
    } finally {
      setCouponBusy(false);
    }
  };
  const seatsLeft = useMemo(
    () => Math.max(0, cohort.capacity - cohort.enrolled_count),
    [cohort.capacity, cohort.enrolled_count]
  );
  const window_ = useMemo(() => enrollmentWindow(cohort), [cohort]);

  if (step.name === "creating" || step.name === "initiating") {
    return (
      <div className="border rounded-2xl p-8 space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <p className="text-sm text-ink-500 pt-2">
          {step.name === "creating" ? "Creating your secure booking order…" : "Connecting to the payment gateway…"}
        </p>
      </div>
    );
  }

  // F-2: never render a dead checkout. A logged-out visitor gets a clear
  // sign-in/register step (with a return trip back to this checkout) instead
  // of an empty learner select and a forever-disabled pay button.
  if (!user) {
    return (
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <div className="bg-deep px-6 py-8 text-white md:px-8">
          <h2 className="font-display text-xl tracking-[0.02em]">Secure checkout</h2>
          <p className="mt-1 text-sm text-white/70">
            {cohort.title} · ₦{cohort.fee.toLocaleString()} {cohort.currency}
          </p>
        </div>
        <div className="space-y-4 p-6 md:p-8">
          {sessionLoading ? (
            <>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-11 w-full" />
            </>
          ) : (
            <>
              <p className="text-sm text-ink-600">
                One quick step before payment: sign in (or create a free parent account) so we can
                secure your seat, hold the payment in escrow and give you instant receipts.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="gold" size="lg" className="w-full sm:w-auto" onClick={() => router.push(loginWithReturn())}>
                  Sign in to enrol
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() => router.push(`/register?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/cohorts")}`)}
                >
                  Create free account
                </Button>
              </div>
              <p className="flex items-center justify-center gap-4 border-t border-ink-100 pt-4 text-[11px] font-semibold text-ink-400">
                <span className="flex items-center gap-1.5"><Lock size={12} className="text-brand-green" /> 256-bit SSL</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-brand-green" /> Escrow protected</span>
                <span className="flex items-center gap-1.5"><RefreshCcw size={12} className="text-brand-green" /> Idempotent orders</span>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step.name === "link") {
    return <PaymentLinkCard order={step.booking.order} payment={step.payment} />;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card"
      noValidate
    >
      {/* Navy summary header (Tuteria payment flow) */}
      <div
        className="bg-cover bg-center px-6 py-8 text-white md:px-8"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(6,15,38,0.88), rgba(1,57,32,0.7)), url(/hero/checkout.jpg)",
        }}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl tracking-[0.02em] text-white">Secure checkout</h2>
          <span className="font-display text-3xl tracking-[0.02em] text-white">
            ₦{cohort.fee.toLocaleString()}
            <span className="text-sm font-medium text-white/70"> {cohort.currency}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-white/70">{cohort.title}</p>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-xl bg-brand-blue-light/50 p-4 text-sm text-ink-600 space-y-1">
          <p className="font-semibold text-ink-800">{cohort.title}</p>
          <p>
            {cohort.start_date} → {cohort.end_date} · {cohort.timezone} · {cohort.location_mode}
          </p>
          <p className={seatsLeft <= 5 ? "text-amber-700 font-medium" : ""}>
            {seatsLeft > 0 ? `${seatsLeft} of ${cohort.capacity} seats left` : "Cohort full"}
          </p>
          {!window_.open && (
            <p className="font-semibold text-red-700">{window_.reason}</p>
          )}
          {window_.open && cohort.enrollment_closes_at && (
            <p className="text-amber-700 font-medium">
              Enrolment closes {new Date(cohort.enrollment_closes_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Steps */}
        <ol className="flex items-center gap-2 text-[11px] font-bold text-ink-500">
          {["Details", "Pay", "Confirmation"].map((s2, i) => (
            <li key={s2} className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-navy text-white">
                {i + 1}
              </span>
              {s2}
              {i < 2 && <span className="h-px w-8 bg-ink-200" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        <p className="text-xs text-ink-500 leading-relaxed">
          Payment is held in escrow and only released to the tutor after delivery is confirmed (or auto-released
          after 3 days). Your booking order is idempotent — retrying never double-charges.
        </p>

        <form.Field name="student_id">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">Learner</span>
              <select
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              >
                <option value="">Select the learner to enrol…</option>
                {(learners.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}
                  </option>
                ))}
              </select>
              {(learners.data ?? []).length === 0 && !learners.isLoading ? (
                <span className="mt-1 block text-xs text-ink-500">
                  No learners linked yet — <a href="/onboarding/learner" className="font-semibold text-brand-blue hover:underline">add a learner</a> first.
                </span>
              ) : null}
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">Billing email</span>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                placeholder="parent@example.com"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>

        <form.Field name="provider">
          {(field) => (
            <fieldset className="text-sm">
              <span className="font-medium">Pay with</span>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["PAYSTACK", "FLUTTERWAVE"] as PaymentProvider[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => field.handleChange(p)}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      field.state.value === p
                        ? "border-brand-blue bg-brand-blue text-white"
                        : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {p === "PAYSTACK" ? "Card · Paystack" : "Bank · Flutterwave"}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </form.Field>

        {/* Coupon / discount (gap #6) */}
        <div className="rounded-xl border border-ink-100 bg-surface-muted/50 p-3">
          <label className="text-sm">
            <span className="font-medium text-ink-700">Promo code (optional)</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponResult(null);
                  setCouponError(null);
                }}
                placeholder="e.g. SAVE10"
                className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={couponBusy || !couponCode.trim()}
                onClick={() => void applyCoupon()}
              >
                {couponBusy ? "Checking…" : "Apply"}
              </Button>
            </div>
          </label>
          {couponResult ? (
            <p className="mt-1.5 text-xs font-semibold text-emerald-700">
              {couponResult.code} applied — {couponResult.currency}{" "}
              {(couponResult.discount ?? 0).toLocaleString()} off your total.
            </p>
          ) : couponError ? (
            <p className="mt-1.5 text-xs text-red-600">{couponError}</p>
          ) : null}
        </div>

        {step.name === "error" ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
            {step.message}
          </div>
        ) : null}

        <form.Subscribe selector={(s) => s.values}>
          {(values) => (
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={
                createBooking.isPending ||
                payMutation.isPending ||
                !values.student_id ||
                !values.email ||
                seatsLeft === 0 ||
                !window_.open
              }
            >
              {createBooking.isPending || payMutation.isPending
                ? "Processing…"
                : !window_.open
                  ? (window_.reason ?? "Enrolment closed")
                  : abVariant("checkout-copy") === "b"
                    ? "Secure my seat now"
                    : "Pay securely now"}
            </Button>
          )}
        </form.Subscribe>

        {/* Secure badges */}
        <div className="flex items-center justify-center gap-5 border-t border-ink-100 pt-4 text-[11px] font-semibold text-ink-400">
          <span className="flex items-center gap-1.5"><Lock size={12} className="text-brand-green" /> 256-bit SSL</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-brand-green" /> Escrow protected</span>
          <span className="flex items-center gap-1.5"><RefreshCcw size={12} className="text-brand-green" /> Idempotent orders</span>
        </div>
      </div>
    </form>
  );
}

function PaymentLinkCard({ order, payment }: { order: Order; payment: InitiatePaymentResponse }) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>(order.status);
  const [checked, setChecked] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // Poll the order until it leaves PENDING (webhook round-trip → PAID/CANCELLED).
  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const res = await apiFetch<Order>(`/me/orders/${order.id}`);
        setStatus(res.data.status);
        setChecked((c) => c + 1);
      } catch {
        /* network hiccup — keep polling */
      }
    }, 6000);
    return () => clearInterval(t);
  }, [status, order.id]);

  // F-3: settle without waiting for the webhook. Ask the API to verify the
  // transaction against the gateway directly (idempotent — the server skips
  // the gateway once the order has left PENDING).
  async function checkWithGateway() {
    if (verifying) return;
    setVerifying(true);
    try {
      const res = await verifyOrder(order.id);
      if (res.order_status) setStatus(res.order_status);
    } catch {
      /* gateway hiccup — the 6s poll keeps running */
    } finally {
      setVerifying(false);
    }
  }

  // One automatic gateway check shortly after the payer returns from the
  // hosted checkout — covers the common "webhook lands 10s late" case with
  // zero user action.
  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setTimeout(() => void checkWithGateway(), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const paid = status === "PAID" || status === "COMPLETED";
  const stillPending = status === "PENDING";
  return (
    <div className="border rounded-2xl p-8 text-center space-y-4" data-testid="payment-link-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-brand-green">
        <ShieldCheck size={26} />
      </div>
      <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy">Order {order.order_number} — ready to pay</h2>
      <p className="text-sm text-ink-600">
        {payment.amount.toLocaleString()} {payment.currency} via{" "}
        {payment.provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}.
        <br />
        Funds are held in escrow until your lessons are delivered.
      </p>
      {paid ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          ✅ Payment confirmed — your seat is secured! View it in your dashboard.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="gold"
            size="lg"
            onClick={() => {
              window.location.href = payment.payment_link;
            }}
          >
            Continue to payment gateway
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              void navigator.clipboard?.writeText(payment.payment_link);
              setCopied(true);
            }}
          >
            {copied ? "Copied ✓" : "Copy payment link"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => void checkWithGateway()}
            disabled={verifying}
            aria-live="polite"
          >
            {verifying ? "Checking…" : "I've paid — confirm now"}
          </Button>
        </div>
      )}
      {stillPending && (
        <p className="text-xs text-ink-400">
          Waiting for payment confirmation… {checked > 0 ? `(checked ${checked}×)` : "this page refreshes automatically"}
        </p>
      )}
      <p className="text-xs text-ink-400">
        Order reference: <span className="font-mono">{payment.provider_reference}</span>
      </p>
    </div>
  );
}
