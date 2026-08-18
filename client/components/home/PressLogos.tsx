// Press wordmark logos - "We are backed by" strip (Forbes · internet.org ·
// BBC · Microsoft · TEF) rendered as clean grayscale wordmarks, matching the
// v2.tuteria.com press strip treatment.

const LOGOS = [
  { name: "Forbes", cls: "font-serif font-bold italic" },
  { name: "internet.org", cls: "font-sans font-light tracking-tight" },
  { name: "BBC", cls: "font-sans font-extrabold tracking-tight" },
  { name: "Microsoft", cls: "font-sans font-bold tracking-tight" },
  { name: "TEF", cls: "font-sans font-extrabold tracking-[0.2em]" },
];

export function PressLogos({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-x-10 gap-y-4 ${className}`}>
      {LOGOS.map((l) => (
        <span
          key={l.name}
          className={`select-none text-lg text-ink-500 transition-colors hover:text-ink-700 ${l.cls}`}
          aria-label={l.name}
        >
          {l.name}
        </span>
      ))}
    </div>
  );
}
