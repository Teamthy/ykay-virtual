import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { GraduationCap, BadgeCheck, ShieldCheck, LineChart } from "lucide-react";

// Auth shell — split-screen NUVORA brand panel (navy, tagline, positioning
// strip, trust points) + white form column. Shared by login/register/
// forgot-password/reset-password/verify-email.

export type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const TRUST = [
  { icon: <GraduationCap size={18} />, text: "British & Nigerian curriculum pathways" },
  { icon: <BadgeCheck size={18} />, text: "1% of tutors — vetted, approved and competency-tested" },
  { icon: <ShieldCheck size={18} />, text: "Payment protection with escrow-held tuition fees" },
  { icon: <LineChart size={18} />, text: "Progress reports released to parents every term" },
];

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="grid min-h-[calc(100vh-73px)] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#111111] p-12 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-brand-gold/15 blur-3xl" />

        <Link href="/" aria-label="NUVORA home" className="relative">
          <Logo dark />
        </Link>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Learning beyond boundaries
          </h1>
          <p className="mt-3 text-white/70">
            British &amp; Nigerian curricula · Exam preparation · Private tuition · Live cohorts.
          </p>
          <ul className="mt-8 space-y-3.5">
            {TRUST.map((t) => (
              <li key={t.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-gold">
                  {t.icon}
                </span>
                {t.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © 2026 NUVORA · Academically governed online learning
        </p>
      </aside>

      {/* Form column */}
      <section className="flex items-center justify-center bg-surface-muted px-6 py-14">
        <div className="w-full max-w-md">
          <Link href="/" aria-label="NUVORA home" className="mb-8 inline-block lg:hidden">
            <Logo />
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-navy">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-ink-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 border-t border-ink-100 pt-5 text-center text-sm text-ink-500">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
