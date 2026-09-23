"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/layout/AuthShell";
import { GoogleButton } from "@/components/ui/google-button";

// Friendly OAuth error page - replaces the raw JSON the API used to return
// when Google sign-in fails (denied, misconfigured, state mismatch…).

function GoogleErrorInner() {
  const sp = useSearchParams();
  const reason = sp.get("reason") ?? "Google sign-in could not be completed.";

  return (
    <AuthShell title="Sign-in didn't go through" subtitle="No changes were made to your account.">
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {reason}
        </div>
        <p className="text-sm leading-6 text-[#0F2A1A]/70">
          You can try again, or use email instead - your account details are untouched.
        </p>
        <div className="space-y-3">
          <GoogleButton label="Try Google again" />
          <Link
            href="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#D6FF57] px-4 text-sm font-semibold text-[#0F2A1A] hover:bg-[#C8F030]"
          >
            Back to log in
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-black/10 px-4 text-sm font-semibold text-[#0F2A1A]/75 hover:border-black/10"
          >
            Create an account
          </Link>
        </div>
        {reason.toLowerCase().includes("configured") && (
          <p className="rounded-lg bg-[#F9F6ED] px-4 py-3 text-xs leading-5 text-[#0F2A1A]/65">
            If you&apos;re the site owner: set <span className="font-mono">GOOGLE_CLIENT_ID</span> and{" "}
            <span className="font-mono">GOOGLE_CLIENT_SECRET</span>, and register the callback URL with Google.
          </p>
        )}
      </div>
    </AuthShell>
  );
}

export default function GoogleErrorPage() {
  return (
    <Suspense fallback={<p className="py-24 text-center text-[#0F2A1A]/65">Loading…</p>}>
      <GoogleErrorInner />
    </Suspense>
  );
}
