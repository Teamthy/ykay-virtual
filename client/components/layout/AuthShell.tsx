import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

// Auth / onboarding shell: a full-height dark photo panel alongside a cream
// canvas and readable white form card. Shared by every sign-in step. Navigation: logo → home, "← Back to home" top-left of the
// form panel. Skip is OPT-IN (`skip` prop) - auth pages don't show it; only
// onboarding steps where skipping makes sense pass it.

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  skip?: { href: string; label?: string };
};

// ykay-students.png is reserved for the Ykay College bridge + /college;
// auth panels use a learner portrait instead.
const IMG = "/hero/african-student.jpg";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  image = IMG,
  imageAlt = "Students learning together",
  skip,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#F9F6ED] text-[#0F2A1A]">
      <div className="mx-auto grid min-h-screen max-w-[1920px] lg:grid-cols-[42%_58%]">
        {/* ── Left panel: full-bleed image with overlay content ── */}
        <aside className="relative hidden overflow-hidden bg-[#0F2A1A] lg:block">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="42vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F2A1A] via-[#0F2A1A]/85 to-[#0F2A1A]/80" />

          {/* Header over image */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-8">
            <Link href="/" aria-label="YK-Virtual home" className="drop-shadow">
              <Logo dark />
            </Link>
            <span className="inline-flex h-9 items-center gap-x-2 rounded-full border border-white/25 bg-white/10 px-4 text-xs font-medium text-white backdrop-blur-sm">
              🇳🇬 English (NG)
            </span>
          </div>

          {/* Headline over image */}
          <div className="absolute inset-x-0 bottom-0 p-9 pb-7">
            <h2 className="max-w-[14ch] font-display text-[clamp(2.6rem,4.2vw,5rem)] uppercase leading-[0.92] tracking-[-0.02em] text-white">
              Learning beyond <span className="text-[#D6FF57]">boundaries.</span>
            </h2>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/80">
              Live one-to-one and small-group lessons built around the
              Nigerian &amp; British curricula.
            </p>

            {/* Honest pillars — product facts, never invented trust marks */}
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/20 pt-5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <span>BECE · WASSCE · IGCSE</span>
              <span>NERDC-aligned practice</span>
              <span>Vetted tutors</span>
            </div>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <section className="relative flex min-h-screen items-center justify-center bg-[#F9F6ED] px-4 sm:px-6">
          {/* Navigation: back to home (always) */}
          <Link
            href="/"
            className="absolute left-6 top-8 inline-flex items-center gap-x-1.5 text-sm font-medium text-[#0F2A1A]/65 transition-colors hover:text-[#0F2A1A]"
          >
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
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
              className="absolute right-6 top-8 inline-flex items-center gap-x-1 text-sm text-[#0F2A1A]/65 transition-colors hover:text-[#0F2A1A]/75"
            >
              {skip.label ?? "Skip"}
              <svg
                className="size-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.08 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          )}

          <div className="w-full min-w-0 max-w-[560px] rounded-[20px] border border-black/10 bg-white px-5 py-8 shadow-[0_15px_60px_rgba(15,42,26,0.08)] sm:px-9 sm:py-10 my-20">
            <div className="text-left">
              <h1 className="font-display text-[clamp(1.8rem,3vw,2.5rem)] uppercase leading-tight text-[#0F2A1A]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm leading-5 text-[#0F2A1A]/65">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="mt-6">{children}</div>

            {footer && (
              <div className="mt-6 border-t border-black/10 pt-5 text-center text-sm text-[#0F2A1A]/65">
                {footer}
              </div>
            )}
          </div>

          {/* Chat button */}
          <a
            href="/contact"
            aria-label="Chat with support"
            className="absolute bottom-4 right-4 hidden size-11 items-center justify-center rounded-full bg-[#D6FF57] shadow-lg transition-colors hover:bg-[#C8F030] lg:flex"
          >
            <svg
              className="size-5 text-[#0F2A1A]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20 11.5a8.5 8.5 0 01-9 8.48 9.7 9.7 0 01-3.8-.77L3 20l1.08-3.8A8.48 8.48 0 013 11.5 8.5 8.5 0 0111.5 3h.01A8.5 8.5 0 0120 11.5z" />
            </svg>
          </a>
        </section>
      </div>
    </div>
  );
}
