import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import Link from "next/link";
import { TutorCommunityStats } from "@/components/home/TutorCommunityStats";
import { TutorBenefits } from "@/components/home/TutorBenefits";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Become a Tutor — Apply to Teach at NUVORA",
  description:
    "Join NUVORA's vetted tutor network. Pass our competency assessment, complete identity verification and start earning from private tuition and cohort programmes.",
  path: "/become-tutor",
});

const STEPS = [
  { n: "1", title: "Create your profile", href: "/become-tutor/apply", desc: "Tell us about yourself, your experience and your rate." },
  { n: "2", title: "Choose your subjects", href: "/become-tutor/subjects", desc: "Pick from our curriculum-governed catalogue." },
  { n: "3", title: "Verify your identity", href: "/become-tutor/documents", desc: "Upload a government-issued ID (private bucket, signed URLs)." },
  { n: "4", title: "Pass the competency quiz", href: "/become-tutor/assessment", desc: "5 questions per subject, 70% to pass, valid 12 months." },
  { n: "5", title: "Track your application", href: "/become-tutor/status", desc: "Live status: review, interview, verification, approval." },
];

const FAQS = [
  { question: "How long does tutor vetting take?", answer: "Most applications move from submission to decision within 5–7 working days, including document verification, interview and competency assessment." },
  { question: "What do I need to apply?", answer: "A government-issued ID, details of your teaching experience and qualifications, and a 70% pass in the subject competency quiz." },
  { question: "When do I get paid?", answer: "Payments for completed lessons are released from escrow weekly — either after the parent confirms delivery or automatically 3 days after each lesson." },
];

export default function BecomeTutorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Become a Tutor", item: "https://nuvora.com/become-tutor" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <PageHero
        announcement="Earn from what you love"
        title="Become a NUVORA tutor"
        subtitle="A five-step, stateful application: build your profile, pick your subjects, verify your identity, pass a short competency quiz — then track your application live."
        ctas={[{ label: "Start tutor application", href: "/become-tutor/apply", primary: true }]}
      />

      <TutorCommunityStats />
      <TutorBenefits />

      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {STEPS.map((s) => (
          <div key={s.n} className="border rounded-2xl p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white font-extrabold text-sm">{s.n}</div>
            <h2 className="font-bold mt-3 text-sm">{s.title}</h2>
            <p className="mt-1.5 text-xs text-ink-600 leading-relaxed">{s.desc}</p>
            <Link href={s.href} className="mt-3 inline-block text-xs font-semibold text-brand-blue hover:underline">
              Go to step →
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">Frequently asked questions</h2>
        <div className="max-w-2xl space-y-3">
          {FAQS.map((f) => (
            <details key={f.question} className="border rounded-xl px-5 py-4">
              <summary className="font-semibold cursor-pointer">{f.question}</summary>
              <p className="mt-2 text-sm text-ink-600">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
