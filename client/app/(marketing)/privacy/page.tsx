import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "How YK-Virtual collects, uses and protects your data - and the rights you have over it.",
  path: "/privacy",
});

const SECTIONS = [
  {
    h: "1. Who we are",
    body: "YK-Virtual ('we', 'us') is an online learning platform connecting learners, parents and tutors across British and Nigerian curricula, exam preparation and private tuition. This policy explains what personal data we collect, why, and the choices you have. It applies to our website, mobile app and services.",
  },
  {
    h: "2. What we collect",
    body: "Account data: name, email address, phone number, password (hashed), role (student, parent, tutor, institution). Learning data: learner profiles, lesson attendance, assignment submissions, quiz results and progress reports. Payment data: processed by Paystack/Flutterwave - we store only order references and status, never card details. Chat data: messages you send to our AI assistant or support team. Technical data: device platform, app version, push tokens and basic usage logs.",
  },
  {
    h: "3. How we use your data",
    body: "To provide the service: enrolment, lessons, grading, payments in escrow and support. To keep you informed: booking confirmations, progress reports and service notifications. To improve: analytics, AI assistant grounding and fraud prevention. To meet legal obligations. We do not sell personal data.",
  },
  {
    h: "4. Children's data",
    body: "Learner profiles for children under 13 are created and managed by a parent or guardian. We collect date-of-birth level information only with a guardian's consent (recorded on the profile). Guardians can request access or deletion of a child's data at any time via privacy@ykaycollege.com.",
  },
  {
    h: "5. AI assistant",
    body: "Our AI assistant (powered by Google Gemini) answers questions grounded in current platform data. Messages may be processed by the AI provider; we redact contact details before processing and retain transcripts for quality and safety. When you ask for a human, the transcript is shared with our support team.",
  },
  {
    h: "6. Third parties",
    body: "Payment processors (Paystack, Flutterwave), push delivery (Expo), AI processing (Google Gemini), analytics and email delivery. Each is contractually bound to use data only for the service provided.",
  },
  {
    h: "7. Security",
    body: "Passwords are hashed (bcrypt); sessions use random tokens stored as SHA-256 hashes in httpOnly cookies or the device keychain; payments are handled by PCI-DSS-compliant processors; access is rate-limited and audited.",
  },
  {
    h: "8. Your rights",
    body: "You may request a copy of your data, correct it, delete your account, withdraw consent, or object to processing. Email privacy@ykaycollege.com. We respond within 30 days. This policy also respects the Nigerian Data Protection Regulation (NDPR) and, where applicable, the GDPR.",
  },
  {
    h: "9. Retention & deletion",
    body: "We keep account data while your account is active. You can request deletion; some records (orders, audit logs) are retained for legal/accounting periods and then anonymised.",
  },
  {
    h: "10. Cookies",
    body: "We use a session cookie for authentication, local storage for onboarding state, and analytics cookies. You can clear these in your browser; the service will still work, though preferences may reset.",
  },
  {
    h: "11. Changes & contact",
    body: "We may update this policy; material changes will be announced on the site. Questions: privacy@ykaycollege.com.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <PageHero
        announcement="Legal"
        title="Privacy Policy"
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
