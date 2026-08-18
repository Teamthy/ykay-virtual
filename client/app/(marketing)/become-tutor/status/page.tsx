"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { useTutorOnboarding } from "@/features/vetting/useTutorOnboarding";
import { OnboardingStepper, SubmittedState } from "@/features/vetting/components/steps";
import { getMyProfile } from "@/features/vetting/api";
import { Skeleton } from "@/components/ui/skeleton";

// Tutor onboarding - step 5 of 5: live application status.

export default function BecomeTutorStatusPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { state } = useTutorOnboarding();

  const profile = useQuery({
    queryKey: ["vetting", "me", user?.id],
    queryFn: () => getMyProfile(),
    enabled: !!user,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login?next=/become-tutor/status");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <main className="container-x py-20 text-center text-ink-500">Loading…</main>;
  }

  return (
    <main className="container-x py-12 max-w-2xl">
      <Link href="/become-tutor" className="text-sm text-brand-blue font-semibold hover:underline">← Back to Become a Tutor</Link>
      <div className="mt-4">
        <OnboardingStepper current={4} />
        {profile.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : profile.data ? (
          <SubmittedState profile={profile.data} />
        ) : (
          <div className="border rounded-2xl p-8 text-center">
            <p className="text-ink-500">No application yet - start with your profile.</p>
            <Link href="/become-tutor/apply" className="btn-gold mt-4 inline-block">Start application</Link>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-ink-400">
          Application id: {state.profileId ? state.profileId.slice(0, 8) : "-"} · saved locally so you can return anytime
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
          >
            Go to my dashboard
          </Link>
          <Link
            href="/become-tutor/apply"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink-300 px-6 py-3 text-sm font-bold text-ink-800 transition-all hover:border-brand-gold"
          >
            Continue application
          </Link>
        </div>
      </div>
    </main>
  );
}
