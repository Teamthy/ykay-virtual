"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import {
  MobileServiceGroups,
  PRIMARY_LINKS,
  ServicesDropdown,
  ServicesToggle,
  navActive,
} from "@/components/layout/public-nav";
import { cn } from "@/lib/utils";

/**
 * Floating pill nav — homepage only (the global Header yields on "/").
 * Same College / CBT / Services set as every other public page, in the
 * dark rounded pill.
 */

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function PlayStoreGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

export function HomePillNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const close = () => {
    setOpen(false);
    setServicesOpen(false);
  };

  return (
    <div className="absolute inset-x-0 top-4 z-40 mx-auto w-full max-w-[980px] px-4 sm:top-6 sm:px-6">
      <nav
        aria-label="Primary"
        className="relative flex h-14 items-center justify-between gap-3 rounded-full bg-[var(--home-pill)] py-2 pe-2 ps-5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] sm:h-16 sm:pe-2.5 sm:ps-7"
      >
        <Link href="/" className="flex-none" aria-label="YK-Virtual home" onClick={close}>
          <Logo dark markClassName="size-7 sm:size-8" className="text-[1.15rem] sm:text-[1.35rem]" />
        </Link>

        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex">
          {PRIMARY_LINKS.map((l) => {
            const active = navActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "pointer-events-auto relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                  active ? "text-white" : "text-white/70 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
          <div className="relative">
            <ServicesToggle open={servicesOpen} onToggle={() => setServicesOpen((v) => !v)} />
            <ServicesDropdown open={servicesOpen} onClose={() => setServicesOpen(false)} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/download"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#D6FF57] px-4 text-[12px] font-bold text-[#0F2A1A] transition hover:bg-[#C8F030] sm:h-11 sm:px-5 sm:text-[13px]"
          >
            Download app
            <AppleGlyph className="size-3.5" />
            <PlayStoreGlyph className="size-3" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="pill-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-full text-white transition hover:bg-white/10 md:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="pill-nav-panel"
          className="mt-2 rounded-[1.75rem] bg-[var(--home-pill)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.32)] md:hidden"
        >
          <ul className="grid list-none grid-cols-2 gap-x-3 gap-y-0.5">
            {PRIMARY_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={close}
                  className={cn(
                    "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    navActive(pathname, l.href)
                      ? "bg-white/10 text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <MobileServiceGroups onNavigate={close} />
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
            <Link
              href="/login"
              onClick={close}
              className="grid place-items-center rounded-full border border-white/20 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/hometutors#booking"
              onClick={close}
              className="grid place-items-center rounded-full bg-[#D6FF57] px-4 py-2.5 text-sm font-bold text-[#0F2A1A] transition hover:bg-[#C8F030]"
            >
              Book a tutor
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
