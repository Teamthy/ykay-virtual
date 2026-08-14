"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { INPUT_CLS } from "@/components/ui/password-input";
import { requestPasswordReset } from "@/features/auth/api";
import { safeNextPath, withNext } from "@/lib/safe-next";

function ForgotPasswordInner() {
  const sp = useSearchParams();
  const next = safeNextPath(sp.get("next"));
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
          <Link href={withNext("/login", next)} className="mt-4 block text-sm text-brand-blue font-semibold hover:underline">
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
          <Link href={withNext("/login", next)} className="text-brand-blue font-semibold hover:underline">
            Back to login
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-ink-800">Email</label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            className={INPUT_CLS}
          />
        </div>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </div>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordInner />
    </Suspense>
  );
}
