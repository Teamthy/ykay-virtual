"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Crown, FileText, GraduationCap, Check, X, BookOpen, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { activatePlus, cancelPlus, getMyAdvisor, getMyPlus, getMyLearningPlan, listPlusPlans, purchasePlus } from "@/features/plus/api";
import { initiatePayment } from "@/features/bookings/api/create";
import { useSession } from "@/hooks/useSession";
import { listLearners } from "@/features/onboarding/api";

export default function PlusPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["me", "plus"], queryFn: getMyPlus, staleTime: 30_000 });
  const plans = useQuery({ queryKey: ["plus", "plans"], queryFn: listPlusPlans, staleTime: 5 * 60_000 });
  const [planCode, setPlanCode] = useState("PLUS");
  const [trialMode, setTrialMode] = useState(true);
  const { user } = useSession();

  const pay = useMutation({
    mutationFn: async () => {
      // Order-backed: purchase creates a PENDING order, then initiate payment.
      const { order } = await purchasePlus(planCode);
      const email = user?.email ?? "";
      const pay = await initiatePayment({ order_id: order.id, provider: "PAYSTACK", email });
      return pay.payment_link;
    },
    onSuccess: (link) => {
      if (link) window.location.assign(link);
    },
    onError: () => toast.error("Could not start payment"),
  });

  const activate = useMutation({
    mutationFn: () => activatePlus(planCode, true),
    onSuccess: () => {
      toast.success("NUVORA Plus activated (7-day trial)");
      qc.invalidateQueries({ queryKey: ["me", "plus"] });
    },
    onError: () => toast.error("Could not activate Plus"),
  });
  const cancel = useMutation({
    mutationFn: cancelPlus,
    onSuccess: () => {
      toast.success("NUVORA Plus cancelled");
      qc.invalidateQueries({ queryKey: ["me", "plus"] });
    },
  });

  const me = status.data;
  const myPlan = me?.subscription ? (plans.data ?? []).find((p) => p.code === me.subscription?.plan_code) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-deep">
          <Crown className="text-brand-gold" /> NUVORA Plus
        </h1>
        {me?.active ? (
          <span className="rounded-full bg-brand-gold px-3 py-1 text-xs font-bold text-deep">Active</span>
        ) : (
          <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-bold text-ink-500">Not subscribed</span>
        )}
      </div>

      {status.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : me?.active ? (
        <div className="rounded-2xl border border-brand-gold/60 bg-brand-gold-light p-6 shadow-soft">
          <p className="text-lg font-bold text-deep">
            {myPlan?.name ?? me.subscription?.plan_code} — active
          </p>
          {me.subscription && (
            <p className="mt-1 text-sm text-ink-600">
              {me.subscription.trial_ends_at
                ? `Trial until ${new Date(me.subscription.trial_ends_at).toLocaleDateString()}`
                : `Renews ${new Date(me.subscription.ends_at).toLocaleDateString()}`}
            </p>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <EntitlementRow on={me.entitlements.cbt_vault} label="Full practice-exam vault" />
            <EntitlementRow on={me.entitlements.verified_certs} label="Verified shareable certificates" />
            <EntitlementRow on={me.entitlements.transcripts} label="Recorded-lesson transcripts" />
            <EntitlementRow on={me.entitlements.ai_assistant} label={`AI tutor · ${me.entitlements.ai_assist_per_day}/day`} />
          </div>
          <AdvisorCard />
          <LearningPlanCard />
          <div className="mt-5">
            <Button variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              Cancel subscription
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-bold text-ink-900">Unlock premium learning</h2>
          <p className="mt-1 text-sm text-ink-600">7-day free trial. Cancel anytime.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(plans.data ?? []).map((p) => (
              <button
                key={p.code}
                onClick={() => setPlanCode(p.code)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  planCode === p.code ? "border-brand-gold bg-brand-gold-light" : "border-ink-200 hover:border-ink-300"
                }`}
              >
                <p className="font-bold text-ink-900">{p.name}</p>
                <p className="mt-1 text-sm text-ink-500">
                  ₦{p.price.toLocaleString()}/{p.billing === "MONTHLY" ? "mo" : "yr"}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2 text-sm text-ink-700">
            <CheckItem>Full practice-exam &amp; CBT vault</CheckItem>
            <CheckItem>Verified, shareable completion certificates</CheckItem>
            <CheckItem>Recorded-lesson transcripts</CheckItem>
            <CheckItem>Higher AI-tutor allowance</CheckItem>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="gold" onClick={() => (trialMode ? activate.mutate() : pay.mutate())} disabled={pay.isPending || activate.isPending}>
              {pay.isPending || activate.isPending
                ? "Processing…"
                : trialMode
                ? "Start free trial"
                : "Subscribe & pay"}
            </Button>
            <button
              onClick={() => setTrialMode((v) => !v)}
              className="self-center text-xs font-semibold text-brand-blue hover:underline"
            >
              {trialMode ? "Skip trial — pay now" : "Start a free trial instead"}
            </button>
            <Link href="/nuvora-plus" className="self-center text-sm font-semibold text-brand-blue hover:underline">
              Learn more about NUVORA Plus
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function EntitlementRow({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {on ? <Check size={16} className="text-brand-green" /> : <X size={16} className="text-ink-300" />}
      <span className={on ? "font-medium text-ink-800" : "text-ink-400"}>{label}</span>
    </div>
  );
}

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Check size={16} className="text-brand-green" /> {children}
    </div>
  );
}

function AdvisorCard() {
  const advisor = useQuery({ queryKey: ["me", "advisor"], queryFn: getMyAdvisor, retry: false });
  if (advisor.isLoading) return null;
  if (advisor.isError || !advisor.data) return null;
  return (
    <div className="mt-5 rounded-xl border border-ink-100 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Your Learning Advisor</p>
      <p className="mt-1 font-bold text-ink-900">{advisor.data.advisor_name || "Your advisor"}</p>
      {advisor.data.advisor_email && (
        <a href={`mailto:${advisor.data.advisor_email}`} className="text-sm text-brand-blue hover:underline">
          {advisor.data.advisor_email}
        </a>
      )}
      {advisor.data.note && <p className="mt-1 text-xs text-ink-500">{advisor.data.note}</p>}
    </div>
  );
}

function LearningPlanCard() {
  const learners = useQuery({ queryKey: ["onboarding", "learners"], queryFn: listLearners, staleTime: 30_000 });
  const [studentId, setStudentId] = useState("");
  useEffect(() => {
    if (!studentId) {
      const first = (learners.data ?? [])[0]?.id;
      if (first) setStudentId(first);
    }
  }, [learners.data, studentId]);
  const plan = useQuery({
    queryKey: ["me", "advisor", "plan", studentId],
    queryFn: () => getMyLearningPlan(studentId),
    enabled: !!studentId,
    retry: false,
  });
  if (plan.isLoading || plan.isError || !plan.data) return null;
  const p = plan.data;
  return (
    <div className="mt-3 rounded-xl border border-brand-gold/40 bg-brand-gold-light p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Your learning plan</p>
        {p.source === "DIAGNOSTIC" && (
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-600">Auto-generated from a diagnostic</span>
        )}
      </div>
      {p.goals && <p className="mt-1 text-sm text-ink-800"><strong>Goals:</strong> {p.goals}</p>}
      {p.focus_areas && <p className="mt-1 text-sm text-ink-700"><strong>Focus:</strong> {p.focus_areas}</p>}
      {p.recommendations && <p className="mt-1 text-sm text-ink-700"><strong>Recommended:</strong> {p.recommendations}</p>}
    </div>
  );
}
