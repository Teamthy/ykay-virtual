import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Pricing - Cohorts, Private Tuition & Exam Prep",
  description:
    "Transparent YK-Virtual pricing: live cohort programmes, vetted private tutors by the hour, and exam-prep intensives. Every payment is escrow-protected until lessons are delivered.",
  path: "/pricing",
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
