"use client";

/**
 * Site-wide cream rib backdrop — the same pleated texture as the green
 * reference, recast as cream → mint → light green. Sections that need a
 * solid surface still set their own background; this stops the page from
 * sitting on a flat fill.
 */
export function AmbientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/home/ribs-cream.jpg"
        alt=""
        className="h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFF7E4]/75 via-[#FFF7E4]/50 to-[#DFFFF2]/40" />
    </div>
  );
}
