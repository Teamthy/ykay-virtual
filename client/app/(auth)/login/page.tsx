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
        router.push(user.roles.includes("TUTOR") ? "/tutor-dashboard" : "/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <main className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold">Welcome back</h1>
        <p className="text-ink-500 text-sm mt-2">Log in to your YKAY account to manage bookings and messages.</p>
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
          <form.Field name="password">
            {(field) => (
              <label className="block text-sm">
                <span className="font-medium">Password</span>
                <input
                  type="password"
                  autoComplete="current-password"
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
          {error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          ) : null}
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </Button>
          <p className="text-center">
            <Link href="/forgot-password" className="text-sm text-brand-blue font-semibold hover:underline">
              Forgot your password?
            </Link>
          </p>
        </form>
        <p className="text-center text-sm text-ink-500 mt-6">
          New to YKAY?{" "}
          <Link href="/register" className="text-brand-blue font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
