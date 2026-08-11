"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { confirmVerification, resendVerificationEmail } from "@/features/auth/api";

type State =
  | { phase: "working" }
  | { phase: "success" }
  | { phase: "error"; message: string }
  | { phase: "resend-sent" };

function VerifyEmailInner() {
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const token = sp.get("token");
  const [state, setState] = useState<State>({ phase: "working" });
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState({ phase: "resend-sent" }); // no token → show resend form
      return;
    }
    confirmVerification(token)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["session"] });
        setState({ phase: "success" });
      })
      .catch((err) =>
        setState({ phase: "error", message: err instanceof Error ? err.message : "Verification failed" })
      );
  }, [token, qc]);

  if (state.phase === "working") {
    return <p className="text-center text-ink-500 py-10">Verifying your email…</p>;
  }

  if (state.phase === "success") {
    return (
      <div className="text-center space-y-4 py-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-extrabold">Email verified!</h1>
        <p className="text-ink-600">Your account is now active. Welcome to NUVORA.</p>
        <Button variant="gold" onClick={() => router.push("/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl">{state.phase === "resend-sent" ? "📬" : "⚠️"}</div>
        <h1 className="text-2xl font-extrabold mt-4">
          {state.phase === "resend-sent" ? "Check your inbox" : "Verification failed"}
        </h1>
        <p className="text-ink-600 mt-2 text-sm">
          {state.phase === "resend-sent"
            ? "We sent a verification link to your email. Click it to activate your account."
            : state.message}
        </p>
      </div>
      <div className="border rounded-2xl p-6 space-y-3">
        <p className="text-sm font-medium">Didn&apos;t get the email? Resend it:</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
        />
        <Button
          variant="gold"
          className="w-full"
          disabled={!email.includes("@")}
          onClick={async () => {
            await resendVerificationEmail(email);
            setState({ phase: "resend-sent" });
          }}
        >
          Resend verification email
        </Button>
        <Link href="/login" className="block text-center text-sm text-brand-blue font-semibold hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md">
        <Suspense fallback={<p className="text-center text-ink-500 py-10">Loading…</p>}>
          <VerifyEmailInner />
        </Suspense>
      </div>
    </main>
  );
}
