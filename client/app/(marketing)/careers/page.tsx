import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Careers — Join NUVORA",
    description: "Join the team building Africa's trusted tutoring platform — engineering, academic operations and tutor success.",
    path: "/careers",
  });
}

export default function CareersPage() {
  return (
    <main className="container-x py-12">
      <PageHero
        eyebrow="Join the team"
        title="Careers at NUVORA"
        subtitle="We are building a full commercial, SEO-first virtual school — not just a lead-gen site."
        crumbs={[{ name: "Home", href: "/" }, { name: "Careers" }]}
        align="left"
      />

      <ul className="mt-8 space-y-4">
        <li className="border p-6 rounded-2xl"><h3 className="font-bold">Full-Stack Engineer (Next.js + Go)</h3><p className="text-sm text-ink-600">SSG/ISR, TanStack Query/Table, escrow, vetting.</p></li>
        <li className="border p-6 rounded-2xl"><h3 className="font-bold">Academic Operations Lead</h3><p className="text-sm text-ink-600">Own programme quality, tutor vetting, safeguarding.</p></li>
      </ul>
    </main>
  );
}
