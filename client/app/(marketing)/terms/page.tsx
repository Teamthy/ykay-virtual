import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "The terms that govern your use of YK-Virtual's learning platform, payments and tutoring services.",
  path: "/terms",
});

const SECTIONS = [
  {
    h: "1. The service",
    body: "YK-Virtual connects learners and parents with tutors and programmes (cohorts, private tuition, exam preparation). By creating an account or using the service you agree to these terms.",
  },
  {
    h: "2. Accounts",
    body: "You must provide accurate information and keep your credentials safe. You are responsible for activity on your account. Accounts for minors must be created by a parent or guardian.",
  },
  {
    h: "3. Payments & escrow",
    body: "Fees are paid via our payment processors. Cohort fees are held in escrow and released to tutors as lessons are delivered. Refunds follow our published policy and applicable consumer law; disputes are resolved via support before any escalation.",
  },
  {
    h: "4. Acceptable use",
    body: "You agree not to misuse the platform: no unauthorised access, scraping, harassment, sharing lesson materials commercially, or interfering with other users. Tutors warrant they provide services lawfully and to a professional standard.",
  },
  {
    h: "5. AI assistant",
    body: "Our AI assistant provides guidance only. It is not a substitute for professional advice (medical, legal, financial). Where accuracy matters (fees, dates), confirm with the official pages or a human agent.",
  },
  {
    h: "6. Intellectual property",
    body: "YK-Virtual content (brand, lesson materials, platform) is owned by us or our licensors. You keep ownership of your submissions; you grant us a licence to store and display them for the purpose of the service.",
  },
  {
    h: "7. Liability",
    body: "The service is provided 'as is'. To the maximum extent permitted by law, our aggregate liability is limited to the fees you paid in the 3 months before the claim. Nothing excludes liability for fraud, death or personal injury caused by negligence.",
  },
  {
    h: "8. Termination",
    body: "You may delete your account at any time. We may suspend accounts that breach these terms. On termination, outstanding obligations (e.g. refunds) are settled per policy.",
  },
  {
    h: "9. Changes",
    body: "We may update these terms; material changes will be announced. Continued use after changes constitutes acceptance.",
  },
  {
    h: "10. Contact & law",
    body: "Questions: legal@ykaycollege.com. These terms are governed by the laws of Nigeria; disputes are subject to the exclusive jurisdiction of the courts of Lagos, Nigeria.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageHero
        announcement="Legal"
        title="Terms of Service"
        subtitle="Last updated: August 2026"
      />

      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold text-brand-navy">{s.h}</h2>
            <p className="mt-2 text-sm leading-7 text-ink-600">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
