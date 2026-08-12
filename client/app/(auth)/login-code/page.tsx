"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/layout/AuthShell";
import { requestLoginCode, confirmLoginCode } from "@/features/auth/api";

// Magic-link login (phase 18): request a 6-digit code → enter it → session.

export default function LoginCodePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const request = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestLoginCode(email.trim());
      setStep("code");
      setCode("");
      setCooldown(30);
      const iv = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      toast.success("Login code sent — check your inbox");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await confirmLoginCode(email.trim(), code.trim());
      toast.success(`Welcome back, ${user.email.split("@")[0]}!`);
      if (user.roles.includes("TUTOR")) router.push("/tutor-dashboard");
      else if (user.roles.includes("PARENT")) router.push("/dashboard");
      else router.push("/student-dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title={step === "email" ? "Log in with a code" : "Enter your login code"}
      subtitle={
        step === "email"
          ? "We'll email you a 6-digit sign-in code — no password needed."
          : `A code was sent to ${email}`
      }
      footer={
        <>
          Prefer a password?{" "}
          <Link href="/login" className="text-brand-blue font-semibold hover:underline">
            Log in instead
          </Link>
        </>
      }
    >
      <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-7 shadow-soft">
        {step === "email" ? (
          <>
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void request()}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => void request()}>
              {busy ? "Sending…" : "Send login code"}
            </Button>
          </>
        ) : (
          <>
            <label className="block text-sm">
              <span className="font-semibold text-ink-700">Login code</span>
              <input
                inputMode="numeric"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && void confirm()}
                placeholder="••••••"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-center text-2xl font-extrabold tracking-[0.4em] text-brand-navy focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
              <p className="mt-2 text-xs text-ink-400">Expires in 10 minutes · single use</p>
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button variant="gold" size="lg" className="w-full" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Signing in…" : "Log in"}
            </Button>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={() => void request()}
              className="w-full text-center text-sm font-semibold text-brand-blue hover:underline disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
