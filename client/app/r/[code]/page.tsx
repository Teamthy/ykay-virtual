import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { apiFetchSSR } from "@/lib/server-api";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift, ShieldCheck, ArrowRight } from "lucide-react";

type Props = { params: Promise<{ code: string }> };

type ReferralLookup = {
  valid: boolean;
  referrer_name?: string;
  reward: number;
  currency: string;
};

export const metadata: Metadata = buildMetadata({
  title: "You've been invited to NUVORA",
  description: "Join Africa's trusted tutoring platform with a friend's referral.",
  path: "/r",
  noIndex: true,
});

async function lookup(code: string): Promise<ReferralLookup | null> {
  try {
    const res = await apiFetchSSR<ReferralLookup>(`/referrals/${encodeURIComponent(code)}`);
    return res.data ?? null;
  } catch {
    return null;
  }
}

export default async function ReferralLandingPage(props: Props) {
  const params = await props.params;
  const code = params.code.toUpperCase().trim();
  const info = await lookup(code);

  // Unknown/unfetchable code → show an honest invalid-invite state, not a 404
  // (users land here from shared links; give them a path forward).
  const valid = !!info?.valid;

  return (
    <main className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-ink-100 bg-white p-10 text-center shadow-card">
        {valid ? (
          <>
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-gold-light text-brand-green">
              <Gift size={28} />
            </span>
            <h1 className="mt-6 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-5xl">
              {info.referrer_name ? `${info.referrer_name} invited you to NUVORA` : "You've been invited to NUVORA"}
            </h1>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-600">
              Create an account with the referral code below and your friend earns{" "}
              <span className="font-bold text-brand-navy">
                {info.currency} {info.reward.toLocaleString()}
              </span>{" "}
              when you pay for your first lesson.
            </p>

            <div className="mx-auto mt-7 flex items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-gold bg-surface-muted px-6 py-4">
              <span className="font-mono text-2xl font-extrabold tracking-[0.2em] text-brand-navy">{code}</span>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/onboarding?ref=${encodeURIComponent(code)}`}
                className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5"
              >
                Create your account <ArrowRight size={15} />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-7 py-3.5 text-sm font-bold text-ink-800 transition hover:border-brand-navy hover:bg-brand-navy hover:text-white"
              >
                Learn more first
              </Link>
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-ink-500">
              <ShieldCheck size={13} className="text-brand-green" />
              Escrow-protected payments · ID-verified tutors
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
              This invite link isn&apos;t valid
            </h1>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-600">
              The referral code may have expired or the link is incomplete. You can still join NUVORA
              directly — no code needed.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover hover:-translate-y-0.5"
              >
                Create your account <ArrowRight size={15} />
              </Link>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-ink-300 px-7 py-3.5 text-sm font-bold text-ink-800 transition hover:border-brand-navy hover:bg-brand-navy hover:text-white">
                Back to home
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
