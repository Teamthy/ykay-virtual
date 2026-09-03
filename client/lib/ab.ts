// Lightweight A/B bucketing — sticky per browser, zero dependencies.
//
// Design rules (keep it boring and safe):
//   - 50/50 split, decided ONCE per key and persisted in localStorage so a
//     user always sees the same variant (flipping copy mid-funnel feels
//     broken and pollutes the experiment).
//   - Values are "control" or "b" — nothing else, ever.
//   - localStorage unavailable (private mode quirks) → "control".
//   - Assignment is exposed to Plausible as an event prop so results are
//     readable as a goal conversion split (see lib/analytics.ts).

const PREFIX = "ykvirtual:ab:";

export type ABVariant = "control" | "b";

export function abVariant(key: string): ABVariant {
  if (typeof window === "undefined") return "control";
  try {
    const stored = window.localStorage.getItem(PREFIX + key);
    if (stored === "control" || stored === "b") return stored;
    const assigned: ABVariant = Math.random() < 0.5 ? "control" : "b";
    window.localStorage.setItem(PREFIX + key, assigned);
    return assigned;
  } catch {
    return "control"; // storage blocked — never break the page over an experiment
  }
}
