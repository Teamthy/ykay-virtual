import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata } from "@/lib/seo";
import { B2BLeadForm } from "@/features/institutions/B2BLeadForm";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "Corporate Training — NUVORA | Workforce Upskilling & Digital Academy",
    description: "Corporate upskilling: Python, AI, Cybersecurity, Microsoft Office, IELTS for staff. What Tuteria corporate could be — structured, audited, with progress reports.",
    path: "/corporate-training",
  });
}

export default function CorporatePage() {
  return (
    <main className="container-x py-12">
      <PageHero
        eyebrow="For organisations"
        title="Corporate Training & Workforce Academy"
        subtitle="Seat-based corporate accounts with cohort access, skills tracking and company-sponsored exam prep — one dashboard for your whole team."
        crumbs={[{ name: "Home", href: "/" }, { name: "Corporate Training" }]}
        align="left"
      />

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="border rounded-2xl p-6"><h3 className="font-bold">Digital Academy for Teams</h3><p className="mt-2 text-sm">Computer Science, Python, AI, Cybersecurity — British curriculum expertise applied to workforce.</p></div>
        <div className="border rounded-2xl p-6"><h3 className="font-bold">Exam Prep as Benefit</h3><p className="mt-2 text-sm">IELTS, TOEFL, GMAT for staff relocating abroad — company-sponsored, tracked.</p></div>
      </div>
          <section className="mt-14 max-w-xl mx-auto">
        <B2BLeadForm defaultType="CORPORATE" ctaLabel="Request corporate training" />
      </section>

</main>
  );
}
