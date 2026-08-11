"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useTutorOnboarding } from "@/features/vetting/useTutorOnboarding";
import { OnboardingStepper, AssessmentStep } from "@/features/vetting/components/steps";

// Tutor onboarding — step 4 of 5.

export default function BecomeTutorAssessmentPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { state, save } = useTutorOnboarding();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login?next=/become-tutor/assessment");
    else if (!state.profileId) router.replace("/become-tutor/apply");
  }, [isLoading, user, state.profileId, router]);

  if (isLoading || !user || !state.profileId) {
    return <main className="container-x py-20 text-center text-ink-500">Loading…</main>;
  }

  return (
    <main className="container-x py-12 max-w-2xl">
      <Link href="/become-tutor/documents" className="text-sm text-brand-blue font-semibold hover:underline">← Back</Link>
      <div className="mt-4">
        <OnboardingStepper current={3} />
        <AssessmentStep
          userId={user.id}
          profileId={state.profileId}
          onDone={() => {
            save({ step: "status" });
            router.push("/become-tutor/status");
          }}
        />
      </div>
    </main>
  );
}
