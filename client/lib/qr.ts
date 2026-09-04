import { headers } from "next/headers";

/**
 * The origin this request actually arrived on — env override first, then the
 * live host. QR codes built from a hardcoded fallback domain point at a site
 * the visitor may not be on (exactly what happens on preview deploys), so the
 * QR is always built from the real request origin.
 *
 * Async because headers() is a Promise in Next 15+.
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    const proto =
      h.get("x-forwarded-proto") ||
      (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return "https://virtual.ykaycollege.com";
  }
}

/** QR image for a URL, so someone on a laptop can scan it onto their phone. */
export function qrUrl(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(url)}`;
}
