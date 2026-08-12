"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { createLearner, listLearners } from "@/features/onboarding/api";

// Onboarding step 2 (parents): add your first learner.
// Stateful flow: /register → /onboarding/learner → /dashboard.

const learnerSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  date_of_birth: z.string().optional(),
  school_name: z.string().optional(),
  current_level: z.string().optional(),
});

const LEVELS = ["Year 7–9 (British)", "IGCSE (Year 10–11)", "A-Level", "JSS1–3 (Nigerian)", "SSS1–3 (Nigerian)", "Other / not sure"];

export default function OnboardingLearnerPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();
  const [busy, setBusy] = useState(false);

  const existing = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });

  const form = useForm({
    defaultValues: { first_name: "", last_name: "", date_of_birth: "", school_name: "", current_level: "" },
    validators: {
      onSubmit: ({ value }) => {
        const res = learnerSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      setBusy(true);
      try {
        const learner = await createLearner({
          first_name: value.first_name,
          last_name: value.last_name,
          date_of_birth: value.date_of_birth || undefined,
          school_name: value.school_name || undefined,
          current_level: value.current_level || undefined,
        });
        qc.invalidateQueries({ queryKey: ["onboarding", "learners"] });
        toast.success(`${learner.first_name} added to your family`, {
          description: "You can add more learners or head to your dashboard.",
        });
        router.push("/dashboard");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add learner");
      } finally {
        setBusy(false);
      }
    },
  });

  if (isLoading) {
    return <main className="container-x py-24 text-center text-ink-500">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="container-x py-24 text-center">
        <h1 className="text-2xl font-extrabold">Sign in to continue</h1>
        <p className="text-ink-500 mt-2 text-sm">Create your account first, then add your learner.</p>
        <Link href="/register" className="btn-gold mt-6 inline-block">Create an account</Link>
      </main>
    );
  }

  const hasLearners = (existing.data?.length ?? 0) > 0;

  return (
    <main className="container-x py-12 flex justify-center">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <ol className="flex items-center gap-1 text-[11px] mb-8 justify-center">
          {["Account", "Learner", "Dashboard"].map((label, i) => (
            <li key={label} className="flex items-center gap-1">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                i < 1 ? "bg-green-500 text-white" : i === 1 ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-400"
              }`}>{i < 1 ? "✓" : i + 1}</span>
              <span className={`${i === 1 ? "font-semibold text-ink-800" : "text-ink-400"}`}>{label}</span>
              {i < 2 && <span className="w-4 h-px bg-ink-200 mx-1" />}
            </li>
          ))}
        </ol>

        <h1 className="text-3xl font-extrabold">
          {hasLearners ? "Add another learner" : "Add your first learner"}
        </h1>
        <p className="text-ink-500 text-sm mt-2">
          Learners are linked to your account — you control their bookings, schedule and progress.
        </p>

        {hasLearners && (
          <div className="mt-5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✓ Already linked: {existing.data?.map((l) => `${l.first_name} ${l.last_name}`).join(", ")}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}
          className="mt-6 border rounded-2xl p-6 space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <form.Field name="first_name">
              {(field) => (
                <label className="block text-sm">
                  <span className="font-medium">First name *</span>
                  <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
                  {field.state.meta.errors?.length ? <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span> : null}
                </label>
              )}
            </form.Field>
            <form.Field name="last_name">
              {(field) => (
                <label className="block text-sm">
                  <span className="font-medium">Last name *</span>
                  <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
                  {field.state.meta.errors?.length ? <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span> : null}
                </label>
              )}
            </form.Field>
          </div>
          <form.Field name="date_of_birth">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Date of birth (optional)</span>
                <input type="date" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
              </label>
            )}
          </form.Field>
          <form.Field name="school_name">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">School (optional)</span>
                <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Lagos Prep School"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
              </label>
            )}
          </form.Field>
          <form.Field name="current_level">
            {(field) => (
              <div className="text-sm">
                <span className="font-medium">Current level (optional)</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <button key={l} type="button" onClick={() => field.handleChange(field.state.value === l ? "" : l)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                        field.state.value === l ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="gold" size="lg" className="flex-1" disabled={busy}>
              {busy ? "Adding…" : hasLearners ? "Add learner & continue" : "Add learner & go to dashboard"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => router.push("/dashboard")}>
              Skip
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
