"use client";

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { login } from "@/features/auth/api";
import { AuthShell } from "@/components/layout/AuthShell";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password is at least 8 characters"),
});

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: ({ value }) => {
        const res = loginSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      setError(null);
      try {
        const user = await login(value.email, value.password);
        qc.setQueryData(["session"], user);
        toast.success(`Welcome back, ${user.email.split("@")[0]}!`);
        if (user.status === "PENDING_VERIFICATION") {
          router.push("/verify-email?sent=1");
          return;
        }
        if (user.roles.includes("TUTOR")) router.push("/tutor-dashboard");
        else if (user.roles.includes("PARENT")) router.push("/dashboard");
        else router.push("/student-dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to your NUVORA account to manage bookings, lessons and progress."
      footer={
        <>
          New to NUVORA?{" "}
          <Link href="/register" className="text-brand-blue font-semibold hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
          className="mt-8 border rounded-2xl p-6 space-y-4"
          noValidate
        >
          <form.Field name="email">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
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
          <form.Field name="password">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
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
          {error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-brand-blue font-semibold hover:underline">
              Forgot your password?
            </Link>
            <Link href="/login-code" className="font-semibold text-ink-500 hover:text-brand-blue hover:underline">
              Log in with a code
            </Link>
          </div>
        </form>
        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <div className="mt-4">
            <button
              type="button"
              disabled
              className="w-full rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-700 flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.97 10.97 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
              Continue with Google
            </button>
            <p className="mt-1 text-center text-[10px] text-ink-400">Google sign-in arrives with OAuth setup — email + password works today.</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
