"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
      <main className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-extrabold">Check your inbox</h1>
          <p className="text-ink-600 text-sm">
            If an account exists for <strong>{email}</strong>, a password reset link is on its way. The link
            expires in 24 hours.
          </p>
          <Link href="/login" className="block text-sm text-brand-blue font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold">Reset your password</h1>
        <p className="text-ink-500 text-sm mt-2">
          Enter the email you registered with and we&apos;ll send you a reset link.
        </p>
        <div className="mt-8 border rounded-2xl p-6 space-y-4">
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
          <Link href="/login" className="block text-center text-sm text-brand-blue font-semibold hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
