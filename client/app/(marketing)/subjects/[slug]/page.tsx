import type { Metadata } from "next";
import { buildMetadata, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedContent } from "@/components/RelatedContent";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: { slug: string } };

const subjects: Record<string, any> = {
  mathematics: { name: "Mathematics", category: "Academic", desc: "From Basic to A-Level, WAEC/NECO/JAMB focused.", exams: ["WAEC", "IGCSE", "JAMB"] },
  "computer-science": { name: "Computer Science", category: "Digital", desc: "IGCSE CS with Computing leader, Python, AI, Cybersecurity.", exams: ["IGCSE", "A-Level"] },
  "ielts-prep": { name: "IELTS Preparation", category: "Professional", desc: "8.0+ average band, 95% success, 750+ students — Tuteria parity + structured mocks.", exams: ["IELTS"] },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = subjects[params.slug];
  if (!s) return buildMetadata({ title: "Subject Not Found", description: "Not found", path: `/subjects/${params.slug}`, noIndex: true });
  return buildMetadata({
    title: `${s.name} Tutoring — ${s.category} | NUVORA`,
    description: s.desc,
    path: `/subjects/${params.slug}`,
  });
}

export default function SubjectPage({ params }: Props) {
  const subject = subjects[params.slug];
  if (!subject) return notFound();

  const course = courseJsonLd({
    name: subject.name,
    description: subject.desc,
    provider: "NUVORA",
    url: `https://nuvora.com/subjects/${params.slug}`,
  });
  const faqs = faqJsonLd([
    { question: `Where will ${subject.name} lessons hold?`, answer: "In your home, online via Google Meet/Zoom, or hybrid — you choose location_mode ONLINE/IN_PERSON/HYBRID." },
    { question: "How do you verify tutors?", answer: "Govt ID + social + guarantor + competency test + lengthy interview + background check + two-way reviews. Docs in PRIVATE bucket with signed URLs." },
  ]);

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Subjects", href: "/subjects" }, { name: subject.name }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqs) }} />

      <div className="text-xs uppercase font-bold tracking-wide text-brand-blue">{subject.category}</div>
      <h1 className="mt-2 text-4xl font-extrabold">{subject.name} — Expert Tutors</h1>
      <p className="mt-4 text-ink-600 max-w-3xl">{subject.desc}</p>
      <div className="mt-4 flex gap-2">
        {subject.exams.map((e: string) => (
          <span key={e} className="text-xs bg-ink-100 px-3 py-1 rounded-full">{e}</span>
        ))}
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-6">
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Private Tuition</h3>
          <p className="mt-2 text-sm text-ink-600">1:1 physical or online, adaptive plan, escrow.</p>
          <Link href={`/programmes?subject=${params.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-blue">Find Tutor →</Link>
        </div>
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Cohort</h3>
          <p className="mt-2 text-sm text-ink-600">Small-group live classes, weekly reports.</p>
          <Link href={`/online-classes?subject=${params.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-blue">Join Cohort →</Link>
        </div>
        <div className="border rounded-2xl p-6">
          <h3 className="font-bold">Related Blog</h3>
          <p className="mt-2 text-sm text-ink-600">Subject-tagged articles for SEO growth loop.</p>
          <Link href={`/blog?subject=${params.slug}`} className="mt-4 inline-block text-sm font-semibold text-brand-blue">Read Guides →</Link>
        </div>
      </div>
      <RelatedContent subjectSlug={subject.slug} />
    </main>
  );
}

export const revalidate = 600;
