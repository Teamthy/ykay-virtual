import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import Link from "next/link";
import {
  UserRound,
  BookOpen,
  ShieldCheck,
  ClipboardCheck,
  LineChart,
} from "lucide-react";
import { TutorCommunityStats } from "@/components/home/TutorCommunityStats";
import { TutorBenefits } from "@/components/home/TutorBenefits";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Become a Tutor - Apply to Teach at YK-Virtual",
  description:
    "Join YK-Virtual's vetted tutor network. Pass our competency assessment, complete identity verification and start earning from private tuition and cohort programmes.",
  path: "/become-tutor",
});

const STEPS = [
  {
    icon: UserRound,
    title: "Create your profile",
    href: "/become-tutor/apply",
    desc: "Tell us about yourself, your experience and your rate.",
  },
  {
    icon: BookOpen,
    title: "Choose your subjects",
    href: "/become-tutor/subjects",
    desc: "Pick from our curriculum-governed catalogue.",
  },
  {
    icon: ShieldCheck,
    title: "Verify your identity",
    href: "/become-tutor/documents",
    desc: "Upload a government-issued ID (private bucket, signed URLs).",
  },
  {
    icon: ClipboardCheck,
    title: "Pass the competency quiz",
    href: "/become-tutor/assessment",
    desc: "5 questions per subject, 70% to pass, valid 12 months.",
  },
  {
    icon: LineChart,
    title: "Track your application",
    href: "/become-tutor/status",
    desc: "Live status: review, interview, verification, approval.",
  },
];

const FAQS = [
  {
    question: "How long does tutor vetting take?",
    answer:
      "Most applications move from submission to decision within 5-7 working days, including document verification, interview and competency assessment.",
  },
  {
    question: "What do I need to apply?",
    answer:
      "A government-issued ID, details of your teaching experience and qualifications, and a 70% pass in the subject competency quiz.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payments for completed lessons are released from escrow weekly - either after the parent confirms delivery or automatically 3 days after each lesson.",
  },
];

export default function BecomeTutorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Become a Tutor",
      item: "https://virtual.ykaycollege.com/become-tutor",
    },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <PageHero
        announcement="Earn from what you love"
        title="Become a YK-Virtual tutor"
        subtitle="A five-step, stateful application: build your profile, pick your subjects, verify your identity, pass a short competency quiz - then track your application live."
        ctas={[
          {
            label: "Start tutor application",
            href: "/become-tutor/apply",
            primary: true,
          },
        ]}
      />

      <div className="container-x py-12">
        <TutorCommunityStats />
        <TutorBenefits />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                  <s.icon size={18} />
                </span>
                <span className="text-xs font-bold text-ink-500">0{i + 1}</span>
              </div>
              <h2 className="mt-4 font-display text-base tracking-[0.02em] text-brand-navy">
                {s.title}
              </h2>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-ink-600">
                {s.desc}
              </p>
              <Link
                href={s.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-green hover:underline"
              >
                Go to step →
              </Link>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold mb-6">
            Frequently asked questions
          </h2>
          <div className="max-w-2xl space-y-3">
            {FAQS.map((f) => (
              <details key={f.question} className="border rounded-xl px-5 py-4">
                <summary className="font-semibold cursor-pointer">
                  {f.question}
                </summary>
                <p className="mt-2 text-sm text-ink-600">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
