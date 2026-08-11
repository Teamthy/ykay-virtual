"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/AuthShell";
import { requestPasswordReset } from "@/features/auth/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your inbox">
        <div className="rounded-2xl border border-ink-100 bg-white p-7 text-center shadow-soft">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-blue-light text-2xl">📬</div>
          <h2 className="mt-4 text-xl font-extrabold text-brand-navy">Check your inbox</h2>
          <p className="mt-2 text-sm text-ink-600">
            If an account exists for <strong>{email}</strong>, a password reset link is on its way. The link
            expires in 24 hours.
          </p>
          <Link href="/login" className="mt-4 block text-sm text-brand-blue font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you registered with and we&apos;ll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="text-brand-blue font-semibold hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <div className="rounded-2xl border border-ink-100 bg-white p-7 shadow-soft space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </label>
          {error ? (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}
          <Button variant="gold" size="lg" className="w-full" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </div>
    </AuthShell>
  );
}
