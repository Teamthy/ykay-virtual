"use client";

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AuthShell } from "@/components/layout/AuthShell";
import { PasswordInput, INPUT_CLS } from "@/components/ui/password-input";
import { GoogleButton } from "@/components/ui/google-button";
import { login } from "@/features/auth/api";

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
          <Link href="/register" className="font-semibold text-brand-gold-dark hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleButton />

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
          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink-800">
                  Email
                </label>
                <input
                  id="login-email"
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

          <form.Field name="password">
            {(field) => (
              <PasswordInput
                id="login-password"
                label="Password"
                autoComplete="current-password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors?.join(", ")}
              />
            )}
          </form.Field>

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
            {submitting ? "Logging in…" : "Log in"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="font-medium text-brand-gold-dark hover:underline">
              Forgot your password?
            </Link>
            <Link href="/login-code" className="font-medium text-ink-500 hover:text-ink-800 hover:underline">
              Log in with a code
            </Link>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
