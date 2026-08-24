import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Apply to Teach - Tutor Application",
  description:
    "Start your NUVORA tutor application: tell us about your teaching experience, qualifications and availability. Vetted tutors teach British & Nigerian curricula and earn with escrow-protected payouts.",
  path: "/become-tutor/apply",
});

export default function BecomeTutorApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
