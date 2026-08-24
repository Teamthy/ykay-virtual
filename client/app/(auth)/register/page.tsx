import { redirect } from "next/navigation";

// Create account now lives in the stateful onboarding flow
// (/onboarding step 1: name + email). Keeping this route as a redirect so
// old links/bookmarks keep working — and FORWARDING the deep-link params so
// the checkout return trip (?next=…) and referral credit (?ref=…) survive
// the hop. Without this, a parent who clicks "Create free account" at
// checkout finishes signup on the dashboard and never comes back to pay.
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  const next = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const ref = Array.isArray(sp.ref) ? sp.ref[0] : sp.ref;
  // Root-relative targets only — onboarding runs them through safeNextPath
  // again before use (belt and braces against open redirects).
  if (next && next.startsWith("/") && !next.startsWith("//")) qs.set("next", next);
  if (ref) qs.set("ref", ref);
  redirect(qs.toString() ? `/onboarding?${qs.toString()}` : "/onboarding");
}
