import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

// Auth shell — split panel. LEFT: narrow, calm, near-black brand rail
// (reference: dark 28% rail — logo top, one contained photo, headline block
// at the lower third, hairline footnote). RIGHT: the form panel, unchanged.
//
// Design rules (docs/MOBILE_DESIGN_AUDIT_2026-08.md / web DESIGN_SYSTEM):
//   - no busy full-bleed photography on the rail; ONE rounded image card
//   - no fabricated social proof — only real, verifiable claims
//   - one deliberate brand accent (the lime rule), no decoration without
//     purpose
// Navigation: logo → home, "← Back to home" on the form panel. Skip is
// OPT-IN (`skip` prop) — auth pages don't show it; onboarding steps where
// skipping makes sense pass it.

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  skip?: { href: string; label?: string };
};

const IMG = "/hero/african-student.jpg";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  image = IMG,
  imageAlt = "A student learning on the NUVORA app",
  skip,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[30%_70%]">
        {/* ── Left rail: dark brand panel ── */}
        <aside
          className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-8"
          style={{ background: "linear-gradient(175deg,#002A18 0%,#013920 62%,#0A4D32 100%)" }}
          aria-hidden="true"
        >
          {/* quiet texture: one deep radial glow, no gradients on content */}
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: "radial-gradient(120% 60% at 50% -10%, rgba(112,242,80,0.08), transparent 60%)" }}
          />

          {/* top — brand */}
          <div className="relative z-10">
            <Link href="/" aria-label="NUVORA home" tabIndex={-1}>
              <Logo dark />
            </Link>
          </div>

          {/* middle — single contained photograph (rounded, natural light) */}
          <div className="relative z-10 mx-auto w-full max-w-[280px]">
            <div className="overflow-hidden rounded-2xl ring-1 ring-white/15">
              <Image
                src={image}
                alt={imageAlt}
                width={768}
                height={1376}
                sizes="(max-width: 1024px) 0px, 280px"
                priority={false}
                className="h-auto w-full object-cover"
              />
            </div>
          </div>

          {/* lower third — headline block */}
          <div className="relative z-10 pb-2">
            <span className="mb-4 block h-0.5 w-10 rounded-full bg-primary" aria-hidden="true" />
            <h1 className="max-w-[17rem] font-display text-[2rem] leading-[1.15] tracking-[0.02em] text-white">
              Learning beyond boundaries.
            </h1>
            <p className="mt-3 max-w-[17rem] text-sm leading-6 text-white/70">
              Vetted tutors, live cohorts and exam prep across the British &amp; Nigerian
              curricula — with every payment held in escrow until lessons are delivered.
            </p>

            {/* footnote — real, verifiable claims only */}
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              <span>Escrow-protected</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-primary/60" />
              <span>Vetted tutors</span>
              <span aria-hidden="true" className="size-1 rounded-full bg-primary/60" />
              <span>WAEC · NECO · JAMB · IGCSE</span>
            </div>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <section className="relative flex min-h-screen items-center justify-center bg-white">
          {/* Navigation: back to home (always) */}
          <Link
            href="/"
            className="absolute left-6 top-8 inline-flex items-center gap-x-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-deep"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            Back to home
          </Link>

          {/* Skip - only where the page opts in */}
          {skip && (
            <Link
              href={skip.href}
              className="absolute right-6 top-8 inline-flex items-center gap-x-1 text-sm text-ink-500 transition-colors hover:text-ink-700"
            >
              {skip.label ?? "Skip"}
              <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.08 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          )}

          <div className="w-full max-w-md px-6 py-16">
            <div className="text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-deep">{title}</h2>
              {subtitle && <p className="mt-1 text-sm leading-5 text-ink-500">{subtitle}</p>}
            </div>

            <div className="mt-6">{children}</div>

            {footer && <div className="mt-6 border-t border-ink-100 pt-5 text-center text-sm text-ink-500">{footer}</div>}
          </div>

          {/* Chat button */}
          <a
            href="/contact"
            aria-label="Chat with support"
            className="absolute -bottom-1 -right-2 hidden size-11 items-center justify-center rounded-full bg-primary shadow-lg transition-colors hover:bg-primary-hover lg:flex"
          >
            <svg className="size-5 text-ink-900" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 11.5a8.5 8.5 0 01-9 8.48 9.7 9.7 0 01-3.8-.77L3 20l1.08-3.8A8.48 8.48 0 013 11.5 8.5 8.5 0 0111.5 3h.01A8.5 8.5 0 0120 11.5z" />
            </svg>
          </a>
        </section>
      </div>
    </div>
  );
}
