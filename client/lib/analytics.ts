// Plausible event bridge — custom goals for the launch funnel.
//
// Safe by construction:
//   - No-ops unless the Plausible script is loaded (it only loads when
//     NEXT_PUBLIC_PLAUSIBLE_DOMAIN is configured — see
//     components/layout/Analytics.tsx), so dev/test never throw.
//   - No PII in event names or props — counts and coarse props only.
//
// Funnel goals (fired from the checkout/receipt surfaces):
//   begin_checkout  (props: ab, cohort)  — "Pay securely now" clicked
//   payment_link    (props: ab, provider)— gateway link created
//   receipt_paid    — receipt page observed the order PAID
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { plausible?: (n: string, o?: { props?: Record<string, unknown> }) => void };
  try {
    w.plausible?.(name, props ? { props } : undefined);
  } catch {
    // analytics must never break UX
  }
}
