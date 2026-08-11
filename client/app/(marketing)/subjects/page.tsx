import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
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
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Subjects" }]} />
      <h1 className="text-4xl font-extrabold">Explore subjects</h1>
      <p className="mt-3 text-ink-600 max-w-2xl">
        Every subject links to its tutors, programmes and study guides — one curriculum-governed
        catalogue across British and Nigerian systems.
      </p>
      <div className="mt-10">
        <Suspense>
          <SubjectsClient />
        </Suspense>
      </div>
    </main>
  );
}
