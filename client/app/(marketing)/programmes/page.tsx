import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { ProgrammesHub } from "@/features/programmes/components/ProgrammesHub";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Programmes - Cohorts, Bootcamps & Exam Prep | NUVORA",
  description:
    "Structured learning programmes: live cohort classes, holiday bootcamps and online classes for IGCSE, WAEC, NECO, JAMB, A-Level and IELTS - with escrow-protected enrollment.",
  path: "/programmes",
});

export default function ProgrammesPage() {
  return (
    <main>
      <PageHero
        cover="/hero/programmes.jpg"
        title="Learning programmes"
        subtitle="Cohort classes, bootcamps and online courses led by vetted tutors. Enroll securely - your fees sit in escrow until the programme delivers."
        crumbs={[{ name: "Home", href: "/" }, { name: "Programmes" }]}
        align="left"
      />

      <div className="container-x mt-10 pb-16">
        <Suspense fallback={<p className="text-center text-ink-500 py-10">Loading programmes…</p>}>
          <ProgrammesHub />
        </Suspense>
      </div>
    </main>
  );
}
