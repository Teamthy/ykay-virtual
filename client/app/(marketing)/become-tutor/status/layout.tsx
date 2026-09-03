import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Application Status - Become a YK-Virtual Tutor",
  description:
    "Track your YK-Virtual tutor application: document verification, subject assessments and the final vetting decision, all in one place.",
  path: "/become-tutor/status",
});

export default function BecomeTutorStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
