import { cn } from "@/lib/utils";

// YK-Virtual brand lockup — geometric "N" mark (neon green on deep-green badge)
// + tracked Anton wordmark. Dark variant flips the wordmark to white for use
// on dark backgrounds; the mark always renders in brand green.

export function Logo({
  className,
  dark = false,
  markClassName,
}: {
  className?: string;
  dark?: boolean;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/brand/mark.png"
        alt="YK-Virtual"
        width={28}
        height={28}
        className={cn("size-7 shrink-0 object-contain", markClassName)}
      />
      <span
        className={cn(
          "font-display text-[1.5rem] uppercase leading-none tracking-[0.02em]",
          dark ? "text-white" : "text-deep",
          className,
        )}
      >
        YK-Virtual
      </span>
    </span>
  );
}
