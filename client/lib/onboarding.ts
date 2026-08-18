// Onboarding draft storage - shared between the onboarding flow and the
// logout paths so that signing out (or a different account signing in) can
// reliably discard a previous user's in-progress signup.
//
// Why this matters: the 7-step onboarding persists a draft (name, email,
// verified flag, role…) in localStorage. If it isn't cleared on logout, the
// NEXT person to open /onboarding on the same browser inherits the previous
// user's partial state - pre-filled name/email or even a skipped step - which
// looks like account bleed between users.

export const ONBOARDING_STORAGE_KEY = "nuvora-onboarding";

export function clearOnboardingDraft(): void {
  try {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    /* storage blocked/unavailable - nothing to clear */
  }
}
