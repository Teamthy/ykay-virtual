// Official store marks - self-contained inline SVGs (no external assets, no
// fabricated logos). The Apple silhouette and Google Play triangle are the
// standard published marks, rendered in currentColor so they adapt to light/
// dark surfaces. Store badge TEXT is composed here so the "App Store - soon"
// state is honest until the iOS listing exists.

export function AppleLogo({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.03 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702" />
    </svg>
  );
}

export function GooglePlayLogo({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

// Store badge shells - the standard badge layout (logo + two-line text).
export function GooglePlayBadge({ href, onClick, disabled }: { href?: string; onClick?: () => void; disabled?: boolean }) {
  const inner = (
    <>
      <GooglePlayLogo size={22} />
      <span className="text-left leading-tight">
        <span className="block text-[9px] uppercase tracking-wide opacity-80">Get it on</span>
        <span className="block text-sm font-bold">Google Play</span>
      </span>
    </>
  );
  const cls =
    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-white transition-transform hover:-translate-y-0.5";
  if (href) {
    return (
      <a href={href} download aria-label="Download the Android APK from Google Play" className={`${cls} bg-black hover:bg-black/85`}>
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={disabled ? "App Store listing coming soon" : "Download on the App Store"}
      title={disabled ? "App Store listing coming soon - use the Android APK for now." : undefined}
      className={`${cls} ${disabled ? "cursor-not-allowed bg-black/40" : "bg-black hover:bg-black/85"}`}
    >
      <AppleLogo size={20} />
      <span className="text-left leading-tight">
        <span className="block text-[9px] uppercase tracking-wide opacity-80">Download on the</span>
        <span className="block text-sm font-bold">App Store</span>
      </span>
    </button>
  );
}
