import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProgrammesClient } from "@/features/programmes/components/ProgrammesClient";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Programmes — Cohorts, Bootcamps & Exam Prep | YKAY",
  description:
    "Structured learning programmes: live cohort classes, holiday bootcamps and online classes for IGCSE, WAEC, NECO, JAMB, A-Level and IELTS — with escrow-protected enrollment.",
  path: "/programmes",
});

export default function ProgrammesPage() {
  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Programmes" }]} />
      <h1 className="text-4xl font-extrabold">Learning programmes</h1>
      <p className="mt-3 text-ink-600 max-w-2xl">
        Cohort classes, bootcamps and online courses led by vetted tutors. Enroll securely — your
        fees sit in escrow until the programme delivers.
      </p>
      <div className="mt-10">
        <Suspense>
          <ProgrammesClient />
        </Suspense>
      </div>
    </main>
  );
}
