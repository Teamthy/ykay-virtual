"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { useTutorOnboarding } from "@/features/vetting/useTutorOnboarding";
import { OnboardingStepper, ProfileStep } from "@/features/vetting/components/steps";

// Tutor onboarding — step 1 of 5 (stateful multi-page flow).

export default function BecomeTutorApplyPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { save } = useTutorOnboarding();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?next=/become-tutor/apply");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <main className="container-x py-20 text-center text-ink-500">Loading…</main>;
  }

  return (
    <main className="container-x py-12 max-w-2xl">
      <Link href="/become-tutor" className="text-sm text-brand-blue font-semibold hover:underline">← Back to Become a Tutor</Link>
      <div className="mt-4">
        <OnboardingStepper current={0} />
        <ProfileStep
          userId={user.id}
          onCreated={(p) => {
            save({ profileId: p.id, step: "subjects" });
            router.push("/become-tutor/subjects");
          }}
        />
      </div>
    </main>
  );
}
