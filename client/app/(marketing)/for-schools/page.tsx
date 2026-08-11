import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { B2BLeadForm } from "@/features/institutions/B2BLeadForm";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "For Schools — NUVORA B2B | Institutional Accounts",
    description: "Partner your school with NUVORA: managed tutor network, cohort scheduling, institutional dashboards, pooled billing, safeguarding. Tuteria lacks true B2B infra — NUVORA builds it.",
    path: "/for-schools",
  });
}

export default function ForSchoolsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "For Schools", item: "https://nuvora.com/for-schools" },
  ]);
  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <h1 className="text-4xl font-extrabold">For Schools — Institutional Accounts</h1>
      <p className="mt-4 max-w-3xl text-lg text-ink-600">
        Tuteria serves individual families. NUVORA adds <strong>institution</strong> entity: schools, learning centres, NGOs can create B2B accounts, bulk-enrol students, assign teachers, get pooled invoices, and monitor attendance/progress in one dashboard.
      </p>

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Bulk Enrolment</h3>
          <p className="mt-2 text-sm text-ink-600">Upload CSV of students, auto-create student profiles + parent links, enrol into cohorts.</p>
        </div>
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Institution Dashboard</h3>
          <p className="mt-2 text-sm text-ink-600">Membership roles OWNER/ADMIN/TEACHER/STUDENT/BILLING, audit-logged PII access.</p>
        </div>
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Pooled Billing</h3>
          <p className="mt-2 text-sm text-ink-600">One wallet, multiple learners, monthly consolidated invoices, institutional discounts.</p>
        </div>
      </div>

      <section className="mt-12 rounded-2xl bg-brand-blue text-white p-8">
        <h2 className="text-2xl font-bold">Beyond Tuteria: What we add</h2>
        <ul className="mt-4 list-disc pl-5 space-y-2 text-white/90">
          <li>institutions table + institution_memberships + institution_students</li>
          <li>Object-level authz: institution admin sees only own students</li>
          <li>Invoice export, VAT handling (when needed)</li>
          <li>SSO / Email domain allowlist (Phase 2)</li>
        </ul>
      </section>
          <section className="mt-14 max-w-xl mx-auto">
        <B2BLeadForm defaultType="SCHOOL" ctaLabel="Request a school account" />
      </section>

</main>
  );
}
