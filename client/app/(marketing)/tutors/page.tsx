import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { TutorsSearchClient } from "@/features/tutors/components/TutorsSearchClient";
import { TutorRowSkeleton } from "@/components/ui/skeleton";

export const revalidate = 60;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const s = searchParams;
  const filterCount = [
    s.subject,
    s.online,
    s.in_person,
    s.min_price,
    s.max_price,
    s.location,
  ].filter((v) => v !== undefined && v !== "").length;

  // Thin filter combos (noindex) vs. core indexable pages (AGENTS.md SEO rule).
  if (filterCount >= 2) {
    return buildMetadata({
      title: "Find Tutors — Filtered Search",
      description: "Filtered tutor search on YK-Virtual.",
      path: "/tutors",
      noIndex: true,
    });
  }
  return buildMetadata({
    title: "Find Private Tutors Online — Vetted & Verified | YK-Virtual",
    description:
      "Search YK-Virtual's vetted private tutors for British & Nigerian curricula, WAEC, NECO, JAMB, IGCSE and A-Level preparation. ID-verified, background-checked, escrow-protected.",
    path: "/tutors",
  });
}

export default async function TutorsPage(props: Props) {
  const searchParams = await props.searchParams;
  const subject =
    typeof searchParams.subject === "string" ? searchParams.subject : undefined;
  const marketplaceEnabled =
    process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED !== "false";

  return (
    <main>
      <PageHero
        title="Find your perfect tutor"
        subtitle="Every tutor on YK-Virtual is identity-verified, background-checked and assessed for subject competency. Payments are held in escrow until your lessons are delivered."
        crumbs={[{ name: "Home", href: "/" }, { name: "Tutors" }]}
        align="left"
        image={{
          src: "/hero/home-tutoring.jpg",
          alt: "Tutor working with a student at home",
        }}
      />
      <div className="container-x pt-12 pb-16">
        {!marketplaceEnabled && (
          <div className="mb-8 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-5 text-sm text-ink-700">
            <strong>Managed matching mode:</strong> tell us what your learner
            needs and our advisors will match a vetted tutor —{" "}
            <a
              href="/private-tuition"
              className="font-semibold text-brand-blue hover:underline"
            >
              request a tutor
            </a>
            .
          </div>
        )}
        <Suspense
          fallback={
            <div className="grid gap-2 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <TutorRowSkeleton key={i} />
              ))}
            </div>
          }
        >
          <TutorsSearchClient initialSubject={subject} />
        </Suspense>
      </div>
    </main>
  );
}
