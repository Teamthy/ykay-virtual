import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Contact NUVORA - Talk to Our Team",
  description:
    "Questions about cohorts, private tuition or becoming a tutor? Contact NUVORA by WhatsApp, email or the contact form - we reply fast.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
