"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordInput, INPUT_CLS } from "@/components/ui/password-input";
import { GoogleButton } from "@/components/ui/google-button";
import { register } from "@/features/auth/api";

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
    role: z.enum(["PARENT", "STUDENT", "TUTOR"]),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

const ROLES = [
  { value: "PARENT" as const, label: "Parent", desc: "Book tutors & programmes for my child", icon: "👪" },
  { value: "STUDENT" as const, label: "Student", desc: "Learn with NUVORA tutors", icon: "🎓" },
  { value: "TUTOR" as const, label: "Tutor", desc: "Apply to teach and earn", icon: "✍️" },
];

function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const refCode = sp.get("ref") ?? undefined;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: { email: "", password: "", confirm: "", role: "PARENT" as "PARENT" | "STUDENT" | "TUTOR", referral_code: refCode ?? "" },
    validators: {
      onSubmit: ({ value }) => {
        const res = registerSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      setError(null);
      try {
        await register({
          email: value.email,
          password: value.password,
          roles: [value.role],
          referral_code: value.referral_code || undefined,
        });
        toast.success("Account created — welcome to NUVORA!");
        // Stateful onboarding: role-specific next step.
        if (value.role === "TUTOR") {
          router.push("/become-tutor/apply");
        } else {
          router.push(`/onboarding?role=${value.role}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create account");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join NUVORA — free to start, escrow-protected payments."
      footer={
        <>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-brand-gold-dark hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleButton label="Sign up with Google" />

        <div className="flex items-center gap-3 text-xs uppercase text-ink-400 before:flex-1 before:border-t before:border-ink-200 before:me-4 after:flex-1 after:border-t after:border-ink-200 after:ms-4">
          Or
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="space-y-4"
          noValidate
        >
          {/* Role chips (Preline role-selection template) */}
          <form.Field name="role">
            {(field) => (
              <div>
                <span className="mb-2 block text-sm font-medium text-ink-800">I am a…</span>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => field.handleChange(r.value)}
                      className={
                        field.state.value === r.value
                          ? "inline-flex h-11 items-center gap-2 rounded-xl border-2 border-brand-gold bg-brand-gold-light px-4 text-sm font-medium text-ink-900"
                          : "inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-700 transition-colors hover:border-brand-gold hover:bg-brand-gold-light/40"
                      }
                    >
                      <span aria-hidden="true">{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-ink-800">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  className={INPUT_CLS}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors?.length ? (
                  <p className="mt-1.5 text-xs text-red-600">{field.state.meta.errors.join(", ")}</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="password">
              {(field) => (
                <PasswordInput
                  label="Password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors?.join(", ")}
                />
              )}
            </form.Field>
            <form.Field name="confirm">
              {(field) => (
                <PasswordInput
                  label="Confirm"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={field.state.meta.errors?.join(", ")}
                />
              )}
            </form.Field>
          </div>

          {refCode && (
            <p className="rounded-lg border border-brand-gold/30 bg-brand-gold-light px-4 py-3 text-xs font-semibold text-brand-gold-dark">
              🎁 Referral code <span className="font-mono">{refCode}</span> will be applied to your account.
            </p>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-500">Loading…</p>}>
      <RegisterInner />
    </Suspense>
  );
}
