"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { confirmPasswordReset } from "@/features/auth/api";
import { safeNextPath, withNext } from "@/lib/safe-next";

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
  const next = safeNextPath(sp.get("next"));
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
        <Button variant="gold" onClick={() => router.push(withNext("/login", next))}>
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
        className="mt-6 space-y-4"
        noValidate
      >
        <form.Field name="password">
          {(field) => (
            <PasswordInput
              label="New password"
              autoComplete="new-password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors?.join(", ")}
            />
          )}
        </form.Field>
        <form.Field name="confirm">
          {(field) => (
            <PasswordInput
              label="Confirm new password"
              autoComplete="new-password"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              error={field.state.meta.errors?.join(", ")}
            />
          )}
        </form.Field>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
        <Link href={withNext("/login", next)} className="block text-center text-sm font-semibold text-brand-gold-dark hover:underline">
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
