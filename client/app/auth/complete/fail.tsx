"use client";

import Link from "next/link";
import { AuthShell } from "@/components/layout/AuthShell";
import { GoogleButton } from "@/components/ui/google-button";

export function AuthCompleteFail() {
  return (
    <AuthShell
      title="We couldn't keep you signed in"
      subtitle="Google (or College) succeeded, but this browser never received the session cookie."
    >
      <div className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Try again below. If it keeps happening, allow cookies for this site and
          retry.
        </p>
        <GoogleButton label="Continue with Google" />
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-700 hover:border-ink-300"
        >
          Use email instead
        </Link>
      </div>
    </AuthShell>
  );
}
