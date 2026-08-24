import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Choose Your Subjects - Tutor Application",
  description:
    "Select the subjects and curricula (British, Nigerian, exam prep) you are qualified to teach on NUVORA. Each subject is assessed before your profile is published.",
  path: "/become-tutor/subjects",
});

export default function BecomeTutorSubjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
