"use client";

import { useState } from "react";

// Stateful multi-page tutor onboarding - profile id travels via localStorage
// so each step page (/become-tutor/{apply,subjects,documents,assessment,status})
// knows where the applicant is in the flow.
//
// IMPORTANT: state is initialised SYNCHRONOUSLY (lazy useState) from
// localStorage. A previous version hydrated in a useEffect, which raced the
// step pages' redirect guards: on first render profileId was still null, so
// /become-tutor/subjects instantly bounced returning applicants back to
// /apply - they could never reach step 2. (Caught by the become-a-tutor e2e.)

const KEY = "ykay-tutor-onboarding";

export type TutorOnboardingState = {
  profileId: string | null;
  step: "apply" | "subjects" | "documents" | "assessment" | "status";
};

function readStored(): TutorOnboardingState {
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TutorOnboardingState>;
        return { profileId: parsed.profileId ?? null, step: parsed.step ?? "apply" };
      }
    }
  } catch {
    // corrupted storage → fresh start
  }
  return { profileId: null, step: "apply" };
}

export function useTutorOnboarding() {
  const [state, setState] = useState<TutorOnboardingState>(readStored);

  const save = (next: Partial<TutorOnboardingState>) => {
    setState((prev) => {
      const merged = { ...prev, ...next };
      try {
        localStorage.setItem(KEY, JSON.stringify(merged));
      } catch {
        // storage unavailable → in-memory only
      }
      return merged;
    });
  };

  const reset = () => {
    setState({ profileId: null, step: "apply" });
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  };

  return { state, save, reset };
}

export const ONBOARDING_STEPS = ["Profile", "Subjects", "Documents", "Quiz", "In review"] as const;
