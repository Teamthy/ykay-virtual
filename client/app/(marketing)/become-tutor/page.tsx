import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { BecomeTutorClient } from "@/features/vetting/components/BecomeTutorClient";

export const metadata: Metadata = buildMetadata({
  title: "Become a Tutor — Apply to Teach at YKAY",
  description:
    "Join YKAY's vetted tutor network. Pass our competency assessment, complete identity verification and start earning from private tuition and cohort programmes.",
  path: "/become-tutor",
});

const faqs = [
  {
    question: "How long does tutor vetting take?",
    answer:
      "Most applications move from submission to decision within 5–7 working days, including document verification, interview and competency assessment.",
  },
  {
    question: "What do I need to apply?",
    answer:
      "A government-issued ID, details of your teaching experience and qualifications, and a 70% pass in the subject competency quiz.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Payments for completed lessons are released from escrow weekly — either after the parent confirms delivery or automatically 3 days after each lesson.",
  },
];

export default function BecomeTutorPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Become a Tutor", item: "https://ykayvirtual.com/become-tutor" },
  ]);
  const faq = faqJsonLd(faqs);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <div className="text-center max-w-2xl mx-auto mb-10">
        <p className="tag-handwritten">Earn from what you love</p>
        <h1 className="text-4xl font-extrabold mt-2">Become a YKAY tutor</h1>
        <p className="mt-3 text-ink-600">
          Four steps to your first paid lesson: build your profile, pick your subjects, verify your
          identity, and pass a short competency quiz. Approved tutors appear on the marketplace and
          receive booking requests from parents.
        </p>
      </div>

      <BecomeTutorClient />

      <section className="mt-16">
        <h2 className="text-2xl font-extrabold mb-6">Frequently asked questions</h2>
        <div className="max-w-2xl space-y-3">
          {faqs.map((f) => (
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
