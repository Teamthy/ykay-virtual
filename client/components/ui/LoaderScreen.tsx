"use client";

// LoaderScreen — branded full-page loading state (route transitions, auth
// checks, boot states). One centered brand spinner on the neutral surface,
// screen-reader friendly, reduced-motion aware. Skeletons remain the
// in-content pattern; this is the page-level one.

export function LoaderScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-surface px-6 py-16"
    >
      <span className="grid size-12 place-items-center rounded-full bg-primary-light" aria-hidden="true">
        <span className="loader-ring" />
      </span>
      <p className="text-sm font-semibold text-ink-500">{label}</p>
      <span className="sr-only">{label} — please wait</span>
    </div>
  );
}
