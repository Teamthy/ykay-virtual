import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Subject Assessment - Tutor Vetting",
  description:
    "Demonstrate subject mastery in your chosen subjects as part of YK-Virtual's tutor vetting process. Assessments are reviewed before your profile goes live.",
  path: "/become-tutor/assessment",
});

export default function BecomeTutorAssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
