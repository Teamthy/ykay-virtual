"use client";

// AmbientBackdrop — a site-wide animated background so no page sits on a
// flat color: brand-tinted glows drift slowly across the viewport and a fine
// grid breathes behind them. Transform-only keyframes (composited, cheap);
// fully disabled for prefers-reduced-motion users. Theme-aware: softer,
// darker glows in dark mode.

export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-grid" />
    </div>
  );
}
