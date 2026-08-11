import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TutorsSearchClient } from "@/features/tutors/components/TutorsSearchClient";

export const revalidate = 60;

type Props = { searchParams: Record<string, string | string[] | undefined> };

export function generateMetadata({ searchParams }: Props): Metadata {
  const s = searchParams;
  const filterCount = [
    s.subject, s.online, s.in_person, s.min_price, s.max_price, s.location,
  ].filter((v) => v !== undefined && v !== "").length;

  // Thin filter combos (noindex) vs. core indexable pages (AGENTS.md SEO rule).
  if (filterCount >= 2) {
    return buildMetadata({
      title: "Find Tutors — Filtered Search",
      description: "Filtered tutor search on NUVORA.",
      path: "/tutors",
      noIndex: true,
    });
  }
  return buildMetadata({
    title: "Find Private Tutors Online — Vetted & Verified | NUVORA",
    description:
      "Search NUVORA's vetted private tutors for British & Nigerian curricula, WAEC, NECO, JAMB, IGCSE, A-Level and IELTS preparation. ID-verified, background-checked, escrow-protected.",
    path: "/tutors",
  });
}

export default function TutorsPage({ searchParams }: Props) {
  const subject = typeof searchParams.subject === "string" ? searchParams.subject : undefined;
  const marketplaceEnabled = process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED !== "false";

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Tutors" }]} />
      <h1 className="text-4xl font-extrabold">Find your perfect tutor</h1>
      <p className="mt-3 text-ink-600 max-w-2xl">
        Every tutor on NUVORA is identity-verified, background-checked and assessed for subject
        competency. Payments are held in escrow until your lessons are delivered.
      </p>
      {!marketplaceEnabled && (
        <div className="mt-6 rounded-2xl bg-brand-blue/5 border border-brand-blue/20 p-5 text-sm text-ink-700">
          <strong>Managed matching mode:</strong> instead of browsing, tell us what your learner needs and our
          advisors will match a vetted tutor —{" "}
          <a href="/private-tuition" className="text-brand-blue font-semibold hover:underline">request a tutor</a>.
        </div>
      )}
      <div className="mt-10">
        <Suspense>
          <TutorsSearchClient initialSubject={subject} />
        </Suspense>
      </div>
    </main>
  );
}
