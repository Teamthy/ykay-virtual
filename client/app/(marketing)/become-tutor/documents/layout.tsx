import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// Server metadata for a "use client" page — titles/descriptions/social cards
// live in the layout so crawlers and share previews still get them.
export const metadata: Metadata = buildMetadata({
  title: "Upload Documents - Tutor Verification",
  description:
    "Upload your credentials, identification and teaching certificates for verification. Documents are malware-scanned and reviewed before tutor approval.",
  path: "/become-tutor/documents",
});

export default function BecomeTutorDocumentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
