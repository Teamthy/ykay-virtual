"use client";

import { useEffect, useState } from "react";

// Stateful multi-page tutor onboarding — profile id travels via localStorage
// so each step page (/become-tutor/{apply,subjects,documents,assessment,status})
// knows where the applicant is in the flow.

const KEY = "ykay-tutor-onboarding";

export type TutorOnboardingState = {
  profileId: string | null;
  step: "apply" | "subjects" | "documents" | "assessment" | "status";
};

export function useTutorOnboarding() {
  const [state, setState] = useState<TutorOnboardingState>({ profileId: null, step: "apply" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const save = (next: Partial<TutorOnboardingState>) => {
    const merged = { ...state, ...next };
    setState(merged);
    try {
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
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
