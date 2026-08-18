"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, ShieldCheck, RefreshCcw } from "lucide-react";
import { qk } from "@/lib/queryClient";
import { createCohortBooking, initiatePayment } from "@/features/bookings/api/create";
import { listLearners } from "@/features/onboarding/api";
import { useSession } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Cohort } from "@/features/cohorts/api/get";
import type { BookingResponse, InitiatePaymentResponse, Order, PaymentProvider } from "@/features/bookings/types";

// Zod schema â€” client + server validation parity (AGENTS.md).
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
  const { user } = useSession();
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
      setStep({ name: "creating" });
      try {
        const booking = await createBooking.mutateAsync({
          cohort_id: cohort.id,
          student_id: value.student_id,
          idempotency_key: idempotencyKey,
        });
        if (!booking.payment_required) {
          setStep({ name: "error", message: "This booking was already paid â€” please check your dashboard." });
          return;
        }
        setStep({ name: "initiating" });
        const payment = await payMutation.mutateAsync({
          order_id: booking.order.id,
          provider: value.provider,
          email: value.email,
        });
        setStep({ name: "link", booking, payment });
        toast.success("Order created â€” opening the payment page");
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

  const seatsLeft = useMemo(
    () => Math.max(0, cohort.capacity - cohort.enrolled_count),
    [cohort.capacity, cohort.enrolled_count]
  );

  if (step.name === "creating" || step.name === "initiating") {
    return (
      <div className="border rounded-2xl p-8 space-y-4" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <p className="text-sm text-ink-500 pt-2">
          {step.name === "creating" ? "Creating your secure booking orderâ€¦" : "Connecting to the payment gatewayâ€¦"}
        </p>
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
            â‚¦{cohort.fee.toLocaleString()}
            <span className="text-sm font-medium text-white/70"> {cohort.currency}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-white/70">{cohort.title}</p>
      </div>

      <div className="space-y-5 p-6">
        <div className="rounded-xl bg-brand-blue-light/50 p-4 text-sm text-ink-600 space-y-1">
          <p className="font-semibold text-ink-800">{cohort.title}</p>
          <p>
            {cohort.start_date} â†' {cohort.end_date} · {cohort.timezone} · {cohort.location_mode}
          </p>
          <p className={seatsLeft <= 5 ? "text-amber-700 font-medium" : ""}>
            {seatsLeft > 0 ? `${seatsLeft} of ${cohort.capacity} seats left` : "Cohort full"}
          </p>
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
          after 3 days). Your booking order is idempotent â€” retrying never double-charges.
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
                <option value="">Select the learner to enrolâ€¦</option>
                {(learners.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}
                  </option>
                ))}
              </select>
              {(learners.data ?? []).length === 0 && !learners.isLoading ? (
                <span className="mt-1 block text-xs text-ink-500">
                  No learners linked yet â€” <a href="/onboarding/learner" className="font-semibold text-brand-blue hover:underline">add a learner</a> first.
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
                seatsLeft === 0
              }
            >
              {createBooking.isPending || payMutation.isPending ? "Processingâ€¦" : "Pay securely now"}
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

  // Poll the order until it leaves PENDING (webhook round-trip â†' PAID/CANCELLED).
  useEffect(() => {
    if (status !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const res = await apiFetch<Order>(`/me/orders/${order.id}`);
        setStatus(res.data.status);
        setChecked((c) => c + 1);
      } catch {
        /* network hiccup â€” keep polling */
      }
    }, 6000);
    return () => clearInterval(t);
  }, [status, order.id]);

  const paid = status === "PAID" || status === "COMPLETED";
  const stillPending = status === "PENDING";
  return (
    <div className="border rounded-2xl p-8 text-center space-y-4" data-testid="payment-link-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-brand-green">
        <ShieldCheck size={26} />
      </div>
      <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy">Order {order.order_number} â€” ready to pay</h2>
      <p className="text-sm text-ink-600">
        {payment.amount.toLocaleString()} {payment.currency} via{" "}
        {payment.provider === "PAYSTACK" ? "Paystack" : "Flutterwave"}.
        <br />
        Funds are held in escrow until your lessons are delivered.
      </p>
      {paid ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          âœ… Payment confirmed â€” your seat is secured! View it in your dashboard.
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
            {copied ? "Copied âœ“" : "Copy payment link"}
          </Button>
        </div>
      )}
      {stillPending && (
        <p className="text-xs text-ink-400">
          Waiting for payment confirmationâ€¦ {checked > 0 ? `(checked ${checked}Ã-)` : "this page refreshes automatically"}
        </p>
      )}
      <p className="text-xs text-ink-400">
        Order reference: <span className="font-mono">{payment.provider_reference}</span>
      </p>
    </div>
  );
}
