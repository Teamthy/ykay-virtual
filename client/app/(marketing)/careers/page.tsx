import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Careers — Join YKAY Virtual School",
    description: "Build the platform that beats Tuteria at SEO and trust. Engineering, academic operations, tutor success.",
    path: "/careers",
  });
}

export default function CareersPage() {
  return (
    <main className="container-x py-12">
      <h1 className="text-4xl font-extrabold">Careers at YKAY</h1>
      <p className="mt-4 text-ink-600">We are building a full commercial, SEO-first virtual school — not just a lead-gen site.</p>
      <ul className="mt-8 space-y-4">
        <li className="border p-6 rounded-2xl"><h3 className="font-bold">Full-Stack Engineer (Next.js + Go)</h3><p className="text-sm text-ink-600">SSG/ISR, TanStack Query/Table, escrow, vetting.</p></li>
        <li className="border p-6 rounded-2xl"><h3 className="font-bold">Academic Operations Lead</h3><p className="text-sm text-ink-600">Own programme quality, tutor vetting, safeguarding.</p></li>
      </ul>
    </main>
  );
}
