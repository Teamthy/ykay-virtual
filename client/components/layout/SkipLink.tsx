// Skip-to-content link (a11y): first focusable element on the page.

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#D6FF57] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-[#0F2A1A]"
    >
      Skip to main content
    </a>
  );
}
