import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "How It Works — Choose, Enrol, Learn, Track | NUVORA",
  description:
    "How NUVORA works for parents, students and tutors: discover programmes, enrol securely with escrow, attend lessons and track progress.",
  path: "/how-it-works",
});

const PARENT_STEPS = [
  { title: "Choose", body: "Browse programmes, cohorts and vetted tutors — filter by curriculum, level and exam." },
  { title: "Enrol / Book", body: "Apply to a cohort or request private tuition. Payments are held in escrow." },
  { title: "Learn", body: "Join live lessons, access resources and complete assignments on schedule." },
  { title: "Track progress", body: "Attendance, tutor notes and progress reports in the parent dashboard." },
];

const TUTOR_STEPS = [
  { title: "Apply", body: "Create your profile and choose your subjects on the Become a Tutor flow." },
  { title: "Get vetted", body: "Identity check, document review, interview and a competency assessment." },
  { title: "Teach", body: "Accept learners, run lessons, mark attendance and write lesson notes." },
  { title: "Get paid", body: "Escrow releases after delivery confirmation; weekly payouts to your account." },
];

export default function HowItWorksPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "How It Works", item: "https://nuvora.com/how-it-works" },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <PageHero
        eyebrow="Simple by design"
        title="How NUVORA works"
        subtitle="Four steps for families, four steps for tutors — with escrow protection and full visibility at every stage."
        crumbs={[{ name: "Home", href: "/" }, { name: "How It Works" }]}
        align="center"
      />


      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">For families</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PARENT_STEPS.map((s, i) => (
            <div key={s.title} className="border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white font-extrabold">{i + 1}</div>
              <h3 className="font-bold mt-3">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-3 flex-wrap">
          <Link href="/programmes" className="btn-primary">Browse programmes</Link>
          <Link href="/private-tuition" className="btn-gold">Request private tuition</Link>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">For tutors</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TUTOR_STEPS.map((s, i) => (
            <div key={s.title} className="border rounded-2xl p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gold text-ink-800 font-extrabold">{i + 1}</div>
              <h3 className="font-bold mt-3">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/become-tutor" className="btn-gold inline-block">Apply to teach</Link>
        </div>
      </section>
    </main>
  );
}
