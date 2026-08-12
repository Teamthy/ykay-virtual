"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { createLearner, listLearners } from "@/features/onboarding/api";
import { AuthShell } from "@/components/layout/AuthShell";
import { Stepper } from "@/components/ui/stepper";
import { INPUT_CLS } from "@/components/ui/password-input";

// Onboarding step 2 (parents & students): add your first learner.
// Stateful flow: /register → /onboarding → /onboarding/learner → /dashboard.

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
        await createLearner({
          first_name: value.first_name,
          last_name: value.last_name,
          date_of_birth: value.date_of_birth || undefined,
          school_name: value.school_name || undefined,
          current_level: value.current_level || undefined,
        });
        qc.invalidateQueries({ queryKey: ["onboarding", "learners"] });
        toast.success("Learner added — welcome!");
        router.push("/dashboard");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not add learner");
      } finally {
        setBusy(false);
      }
    },
  });

  if (isLoading) {
    return <p className="py-20 text-center text-ink-500">Loading…</p>;
  }

  if (!user) {
    return (
      <AuthShell title="Sign in to continue" subtitle="Create your account first, then add your learner.">
        <Link href="/register" className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover">
          Create an account
        </Link>
      </AuthShell>
    );
  }

  const hasLearners = (existing.data?.length ?? 0) > 0;

  return (
    <AuthShell
      title={hasLearners ? "Add another learner" : "Add your first learner"}
      subtitle="Learners are linked to your account — you control their bookings, schedule and progress."
    >
      <div className="space-y-5">
        <Stepper steps={["Account", "Learner", "Dashboard"]} current={1} />

        {hasLearners && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✓ Already linked: {existing.data?.map((l) => `${l.first_name} ${l.last_name}`).join(", ")}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="first_name">
              {(field) => (
                <div>
                  <label htmlFor="ln-first" className="mb-1.5 block text-sm font-medium text-ink-800">First name *</label>
                  <input
                    id="ln-first"
                    className={INPUT_CLS}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors?.length ? <p className="mt-1.5 text-xs text-red-600">{field.state.meta.errors.join(", ")}</p> : null}
                </div>
              )}
            </form.Field>
            <form.Field name="last_name">
              {(field) => (
                <div>
                  <label htmlFor="ln-last" className="mb-1.5 block text-sm font-medium text-ink-800">Last name *</label>
                  <input
                    id="ln-last"
                    className={INPUT_CLS}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors?.length ? <p className="mt-1.5 text-xs text-red-600">{field.state.meta.errors.join(", ")}</p> : null}
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="date_of_birth">
            {(field) => (
              <div>
                <label htmlFor="ln-dob" className="mb-1.5 block text-sm font-medium text-ink-800">Date of birth (optional)</label>
                <input id="ln-dob" type="date" className={INPUT_CLS} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
              </div>
            )}
          </form.Field>

          <form.Field name="school_name">
            {(field) => (
              <div>
                <label htmlFor="ln-school" className="mb-1.5 block text-sm font-medium text-ink-800">School (optional)</label>
                <input
                  id="ln-school"
                  className={INPUT_CLS}
                  placeholder="e.g. Lagos Prep School"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="current_level">
            {(field) => (
              <div className="text-sm">
                <span className="mb-2 block font-medium text-ink-800">Current level (optional)</span>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => field.handleChange(field.state.value === l ? "" : l)}
                      className={
                        field.state.value === l
                          ? "inline-flex h-9 items-center rounded-full border border-brand-gold bg-brand-gold-light px-3.5 text-xs font-semibold text-ink-900"
                          : "inline-flex h-9 items-center rounded-full border border-ink-200 bg-white px-3.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-gold"
                      }
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
            >
              {busy ? "Adding…" : hasLearners ? "Add learner & continue" : "Add learner & go to dashboard"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-200 bg-white px-5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
