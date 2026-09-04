"use client";

// AmbientBackdrop v2 — premium layered depth: twin brand glows drifting, a
// slow aurora sweep, a fine dot field, and an edge vignette so every page
// sits on rich, quietly-moving brand light instead of a flat color.
// Transform-only animations; fully disabled for prefers-reduced-motion.

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="ambient2-glow-a" />
      <div className="ambient2-glow-b" />
      <div className="ambient2-sweep" />
      <div className="ambient2-dots" />
      <div className="ambient2-vignette" />
    </div>
  );
}
