import type { Metadata } from "next";
import { buildMetadata, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RelatedContent } from "@/components/RelatedContent";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: { slug: string } };

const programmes: Record<string, any> = {
  "igcse-computer-science": {
    title: "IGCSE Computer Science",
    summary: "Structured online preparation for IGCSE Computer Science with live lessons and guided revision.",
    curriculum: "British",
    level: "IGCSE Year 10-11",
    format: "Cohort",
    price: "₦35,000",
    topics: ["Problem Solving", "Programming", "Databases", "Networking"],
    faqs: [
      { q: "How does the cohort work?", a: "100+ live lessons, recordings, 200+ topic practice, weekly CBT mocks, remedial support — similar to Tuteria Prep but integrated." },
      { q: "Is tutor vetted?", a: "Yes, 7-stage vetting: account, personal, professional, teaching scope, evidence (PRIVATE bucket signed URLs), interview, activation." },
    ],
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = programmes[params.slug];
  if (!p) return buildMetadata({ title: "Programme Not Found", description: "Not found", path: `/programmes/${params.slug}`, noIndex: true });
  return buildMetadata({
    title: `${p.title} — ${p.curriculum} ${p.level} | YKAY`,
    description: p.summary,
    path: `/programmes/${params.slug}`,
  });
}

export default function ProgrammePage({ params }: Props) {
  const p = programmes[params.slug];
  if (!p) return notFound();

  const course = courseJsonLd({
    name: p.title,
    description: p.summary,
    provider: "YKAY Virtual School",
    url: `https://ykayvirtual.com/programmes/${params.slug}`,
  });
  const faq = faqJsonLd(p.faqs.map((f: any) => ({ question: f.q, answer: f.a })));

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Programmes", href: "/programmes" }, { name: p.title }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <div className="text-xs uppercase font-bold text-brand-blue">{p.curriculum} • {p.level} • {p.format}</div>
      <h1 className="mt-2 text-4xl font-extrabold">{p.title}</h1>
      <p className="mt-4 text-lg text-ink-600 max-w-3xl">{p.summary}</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-10">
        <div>
          <h3 className="font-bold text-lg">Topics Covered</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {p.topics.map((t: string) => (
              <li key={t} className="border rounded-xl px-4 py-3 text-sm bg-white">{t}</li>
            ))}
          </ul>

          <section className="mt-10">
            <h3 className="font-bold text-lg">Cohorts & Private Tuition</h3>
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className="border rounded-2xl p-5"><div className="font-bold">Cohort — Jan 2026</div><div className="mt-2 text-sm">Fee: {p.price} • 20 seats • Tutor: YKAY Team</div><button className="mt-4 btn-gold w-full">Enrol</button></div>
              <div className="border rounded-2xl p-5"><div className="font-bold">Private Tuition</div><div className="mt-2 text-sm">1:1 online or home • Adaptive plan • Escrow protected</div><Link href="/programmes?private=true" className="mt-4 inline-block text-sm font-semibold text-brand-blue">Request Tutor →</Link></div>
            </div>
          </section>

          <section className="mt-10">
            <h3 className="font-bold">FAQ</h3>
            <div className="mt-4 space-y-4">
              {p.faqs.map((f: any) => (
                <div key={f.q} className="border rounded-2xl p-5"><div className="font-semibold">{f.q}</div><div className="mt-2 text-sm text-ink-600">{f.a}</div></div>
              ))}
            </div>
          </section>
        </div>

        <div className="border rounded-2xl p-6 h-fit lg:sticky lg:top-28">
          <div className="font-bold">Enrol in {p.title}</div>
          <p className="mt-2 text-sm text-ink-600">Orders create wallet hold → tutor gets escrow release after lesson confirmation or 3-day auto-release. Idempotent webhook via provider_reference UNIQUE (SLO zero duplicate charges).</p>
          <button className="mt-6 btn-gold w-full text-base py-4">Find a Programme — {p.price}</button>
          <div className="mt-4 text-xs text-ink-500">Good Fit Guarantee • Secure escrow • Verified tutors</div>
        </div>
      </div>
      <RelatedContent subjectSlug={p.slug} />
    </main>
  );
}

export const revalidate = 600;
