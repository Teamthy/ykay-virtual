import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";

// Auth shell — Preline split-panel: left 30% cream panel with brand + image
// + trusted strip, right 70% white panel with the form. Shared by login,
// register, forgot/reset password, OTP/login-code, verify-email, onboarding.

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  image?: string;
  imageAlt?: string;
};

const IMG =
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80";

export function AuthShell({ title, subtitle, children, footer, image = IMG, imageAlt = "Tutor helping a student learn" }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[30%_70%]">
        {/* ── Left panel ── */}
        <aside className="relative hidden overflow-hidden bg-surface-muted lg:flex lg:flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-8">
            <Link href="/" aria-label="NUVORA home">
              <Logo />
            </Link>
            <span className="inline-flex h-9 items-center gap-x-2 rounded-lg border border-ink-200 bg-white px-3 text-xs font-medium text-ink-700 shadow-sm">
              🇳🇬 English (NG)
            </span>
          </div>

          {/* Visual */}
          <div className="flex flex-1 flex-col justify-center px-9 pb-8">
            <h1 className="max-w-xs font-display text-3xl leading-tight tracking-[0.02em] text-brand-navy">
              Learning beyond boundaries
            </h1>
            <div className="relative mt-5 overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={image}
                alt={imageAlt}
                width={720}
                height={520}
                className="h-[300px] w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-sm font-semibold text-white">
                  Join 30,000+ families learning with NUVORA
                </p>
              </div>
            </div>
          </div>

          {/* Trusted strip */}
          <div className="flex items-center gap-x-6 px-10 pb-7 text-sm font-semibold text-ink-400">
            <span className="font-serif font-bold italic">Forbes</span>
            <span>BBC</span>
            <span className="font-extrabold tracking-tight">Microsoft</span>
            <span className="font-extrabold tracking-[0.18em]">TEF</span>
          </div>
        </aside>

        {/* ── Right panel ── */}
        <section className="relative flex min-h-screen items-center justify-center bg-white">
          {/* Skip */}
          <Link
            href="/"
            className="absolute right-6 top-8 inline-flex items-center gap-x-1 text-sm text-ink-500 transition-colors hover:text-ink-700"
          >
            Skip
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L10.94 10 7.23 6.29a.75.75 0 111.06-1.06l4.24 4.24a.75.75 0 010 1.06l-4.24 4.24a.75.75 0 01-1.08 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          <div className="w-full max-w-md px-6 py-16">
            <div className="text-left">
              <h2 className="text-2xl font-semibold tracking-tight text-[#0d2a49]">{title}</h2>
              {subtitle && <p className="mt-1 text-sm leading-5 text-ink-500">{subtitle}</p>}
            </div>

            <div className="mt-6">{children}</div>

            {footer && <div className="mt-6 border-t border-ink-100 pt-5 text-center text-sm text-ink-500">{footer}</div>}
          </div>

          {/* Chat button */}
          <a
            href="/contact"
            aria-label="Chat with support"
            className="absolute -bottom-1 -right-2 hidden size-11 items-center justify-center rounded-full bg-brand-gold shadow-lg transition-colors hover:bg-brand-gold-hover lg:flex"
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
