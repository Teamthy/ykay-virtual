import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";
import { SubjectsClient } from "@/features/subjects/components/SubjectsClient";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "All Subjects & Exam Prep — British & Nigerian Curricula | NUVORA",
  description:
    "Browse every subject NUVORA teaches: Mathematics, English, Sciences, Digital skills, Languages, Music and exam preparation for WAEC, NECO, JAMB, IGCSE, A-Level, IELTS and more.",
  path: "/subjects",
});

export default function SubjectsPage() {
  return (
    <main className="container-x py-10">
      <PageHero
        title="Explore subjects"
        subtitle="Every subject links to its tutors, programmes and study guides — one curriculum-governed catalogue across British and Nigerian systems."
        crumbs={[{ name: "Home", href: "/" }, { name: "Subjects" }]}
        align="left"
      />

      <div className="mt-10">
        <Suspense>
          <SubjectsClient />
        </Suspense>
      </div>
    </main>
  );
}
