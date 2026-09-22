/** Reduced-motion helpers shared by UI motion primitives. */

export function prefersReducedMotionSync(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
