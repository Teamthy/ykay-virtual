import { redirect } from "next/navigation";

// Learner step is now step 4 of the stateful onboarding flow.
export default function OnboardingLearnerPage() {
  redirect("/onboarding?step=4");
}
