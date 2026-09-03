import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

// Auth shell - Preline split-panel: left 30% FULL-BLEED education photo with
// overlaid brand header + headline + trusted strip, right 70% white panel
// with the form. Navigation: logo → home, "← Back to home" top-left of the
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

const IMG = "/hero/home-tutoring.jpg";

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
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[30%_70%]">
        {/* ── Left panel: full-bleed image with overlay content ── */}
        <aside className="relative hidden overflow-hidden lg:block">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="30vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />

          {/* Header over image */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-8">
            <Link href="/" aria-label="YK-Virtual home" className="drop-shadow">
              <Logo dark />
            </Link>
            <span className="inline-flex h-9 items-center gap-x-2 rounded-lg border border-white/25 bg-white/10 px-3 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
              🇳🇬 English (NG)
            </span>
          </div>

          {/* Headline over image */}
          <div className="absolute inset-x-0 bottom-0 p-9 pb-7">
            <h1 className="max-w-xs font-display text-3xl leading-tight tracking-[0.02em] text-white">
              Learning beyond boundaries
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/80">
              Join 30,000+ families learning with YK-Virtual tutors.
            </p>

            {/* Trusted strip */}
            <div className="mt-6 flex items-center gap-x-6 border-t border-white/20 pt-5 text-sm font-semibold text-white/70">
              <span className="font-serif font-bold italic">Forbes</span>
              <span>BBC</span>
              <span className="font-extrabold tracking-tight">Microsoft</span>
              <span className="font-extrabold tracking-[0.18em]">TEF</span>
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
              className="absolute right-6 top-8 inline-flex items-center gap-x-1 text-sm text-ink-500 transition-colors hover:text-ink-700"
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

          <div className="w-full max-w-md px-6 py-16">
            <div className="text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-deep">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm leading-5 text-ink-500">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="mt-6">{children}</div>

            {footer && (
              <div className="mt-6 border-t border-ink-100 pt-5 text-center text-sm text-ink-500">
                {footer}
              </div>
            )}
          </div>

          {/* Chat button */}
          <a
            href="/contact"
            aria-label="Chat with support"
            className="absolute -bottom-1 -right-2 hidden size-11 items-center justify-center rounded-full bg-primary shadow-lg transition-colors hover:bg-primary-hover lg:flex"
          >
            <svg
              className="size-5 text-ink-900"
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
