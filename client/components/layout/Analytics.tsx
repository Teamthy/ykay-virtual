import Script from "next/script";

// Analytics — privacy-friendly, cookieless, and OFF until configured.
// Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN (e.g. nuvora.com) in the client env and
// page views + outbound link clicks are measured. Without the env var this
// renders nothing (no scripts, no requests, no layout shift).
//
// Why Plausible over GA4: no cookies → no consent-banner burden, no PII,
// EU-hosted, 1-line integration. If you prefer GA4/Vercel Analytics later,
// swap this component — nothing else depends on it.
//
// Custom goals worth wiring after launch (plausible("event", …)):
//   begin_checkout → pay_now_clicked → payment_link_visited
//   receipt_paid   → enrolment_confirmed → tutor_application_started
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  return (
    <Script
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
      data-domain={domain}
      defer
    />
  );
}
