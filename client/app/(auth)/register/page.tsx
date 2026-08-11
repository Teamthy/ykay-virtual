"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { login, register } from "@/features/auth/api";

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
    role: z.enum(["PARENT", "STUDENT", "TUTOR"]),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

const ROLE_COPY: Record<string, { title: string; desc: string }> = {
  PARENT: { title: "I'm a parent", desc: "Book tutors and programmes for my child" },
  STUDENT: { title: "I'm a student", desc: "Learn with YKAY tutors" },
  TUTOR: { title: "I'm a tutor", desc: "Apply to teach and earn" },
};

function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const refCode = sp.get("ref") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirm: "",
      role: "PARENT" as "PARENT" | "STUDENT" | "TUTOR",
      referral_code: refCode,
    },
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
        const user = await register({
          email: value.email,
          password: value.password,
          roles: [value.role],
          referral_code: value.referral_code || undefined,
        });
        // Auto-login after registration (smooth first-run experience).
        await login(value.email, value.password);
        toast.success("Account created — welcome to YKAY!");
        if (user.roles.includes("TUTOR")) router.push("/become-tutor/apply");
        else if (user.roles.includes("PARENT")) router.push("/onboarding/learner");
        else router.push("/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <main className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold">Create your account</h1>
        <p className="text-ink-500 text-sm mt-2">Join YKAY — free to start, escrow-protected payments.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="mt-8 border rounded-2xl p-6 space-y-4"
          noValidate
        >
          <form.Field name="role">
            {(field) => (
              <fieldset>
                <span className="text-sm font-medium">I am a…</span>
                <div className="mt-2 grid gap-2">
                  {(["PARENT", "STUDENT", "TUTOR"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => field.handleChange(r)}
                      className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                        field.state.value === r ? "border-brand-blue bg-brand-blue/5" : "hover:border-ink-400"
                      }`}
                    >
                      <span className="text-sm font-semibold">{ROLE_COPY[r].title}</span>
                      <span className="block text-xs text-ink-500">{ROLE_COPY[r].desc}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
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
          {refCode && (
            <p className="rounded-xl bg-brand-blue/5 border border-brand-blue/20 px-4 py-3 text-xs text-brand-blue font-semibold">
              🎁 You were referred! Code <span className="font-mono">{refCode}</span> will be applied to your account.
            </p>
          )}
          <form.Field name="referral_code">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Referral code (optional)</span>
                <input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. ABC12345 — earn a reward together"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                />
              </label>
            )}
          </form.Field>
          <div className="grid grid-cols-2 gap-3">
            <form.Field name="password">
              {(field) => (
                <label className="block text-sm">
                  <span className="font-medium">Password</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </label>
              )}
            </form.Field>
            <form.Field name="confirm">
              {(field) => (
                <label className="block text-sm">
                  <span className="font-medium">Confirm</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors?.length ? (
                    <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
                  ) : null}
                </label>
              )}
            </form.Field>
          </div>
          {error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-500 mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-brand-blue font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-center text-ink-500 py-16">Loading…</p>}>
      <RegisterInner />
    </Suspense>
  );
}
