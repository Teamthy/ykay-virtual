"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/AuthShell";
import { confirmPasswordReset } from "@/features/auth/api";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

function ResetPasswordInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm({
    defaultValues: { password: "", confirm: "" },
    validators: {
      onSubmit: ({ value }) => {
        const res = resetSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        setError("This reset link is invalid — please request a new one.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await confirmPasswordReset(token, value.password);
        setDone(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reset failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (done) {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-extrabold">Password updated</h1>
        <p className="text-ink-600 text-sm">Your password was changed. All other sessions were signed out.</p>
        <Button variant="gold" onClick={() => router.push("/login")}>
          Log in with your new password
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Choose a new password</h1>
      <p className="text-ink-500 text-sm mt-2">Minimum 8 characters. Signing in elsewhere will be required after this.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="mt-8 border rounded-2xl p-6 space-y-4"
        noValidate
      >
        <form.Field name="password">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">New password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>
        <form.Field name="confirm">
          {(field) => (
            <label className="block text-sm">
              <span className="font-medium">Confirm new password</span>
              <input
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{field.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>
        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Updating…" : "Update password"}
        </Button>
        <Link href="/login" className="block text-center text-sm text-brand-blue font-semibold hover:underline">
          Back to login
        </Link>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password to secure your NUVORA account.">
      <Suspense fallback={<p className="text-center text-ink-500 py-10">Loading…</p>}>
        <ResetPasswordInner />
      </Suspense>
    </AuthShell>
  );
}
