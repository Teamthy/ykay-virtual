import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Computing & Digital Skills — CS, Python, AI, Cybersecurity | NUVORA",
  description:
    "Computer Science, ICT, Python, AI, Cybersecurity and Microsoft Office — cohorts and private tuition.",
  path: "/digital-skills",
});

const TRACKS = [
  { title: "Computer Science", desc: "IGCSE/SSS Computer Science with programming and theory.", href: "/programmes", photo: "/hero/digital.jpg" },
  { title: "ICT & Digital Literacy", desc: "Practical computing for school and the workplace.", href: "/programmes", photo: "/hero/subjects.jpg" },
  { title: "Python Programming", desc: "From first programs to real projects.", href: "/programmes", photo: "/hero/test-prep.jpg" },
  { title: "Artificial Intelligence", desc: "Concepts, tools and responsible AI use for students.", href: "/programmes", photo: "/hero/programmes.jpg" },
  { title: "Cybersecurity", desc: "Safe online habits and security fundamentals.", href: "/programmes", photo: "/hero/how-it-works.jpg" },
  { title: "Microsoft Office", desc: "Word, Excel, PowerPoint and certification prep.", href: "/programmes", photo: "/hero/checkout.jpg" },
];

export default function DigitalSkillsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Digital Skills", item: "https://nuvora.com/digital-skills" },
  ]);
  const course = courseJsonLd({
    name: "Computing & Digital Skills Academy",
    description: "Computer Science, ICT, Python, AI, Cybersecurity and Microsoft Office.",
    provider: "NUVORA",
    url: "https://nuvora.com/digital-skills",
  });

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <PageHero
        cover="/hero/digital.jpg"
        eyebrow="The digital academy"
        title="Computing & Digital Skills"
        subtitle="Computer Science, programming, AI and digital safety — taught as structured cohorts or one-to-one."
        crumbs={[{ name: "Home", href: "/" }, { name: "Digital Skills" }]}
        image={{ src: "/hero/test-prep.jpg", alt: "Student learning to code" }}
        ctas={[
          { label: "Browse programmes", href: "/programmes", primary: true },
          { label: "Book a coding tutor", href: "/private-tuition" },
        ]}
      />

      <div className="container-x pt-14 pb-16">
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t) => (
            <Link
              key={t.title}
              href={t.href}
              className="overflow-hidden rounded-2xl border border-ink-100 bg-cover bg-center p-6 text-white shadow-card transition hover:-translate-y-0.5"
              style={{
                backgroundImage:
                  "linear-gradient(165deg, rgba(6,15,38,0.9), rgba(1,57,32,0.7)), url(/hero/test-prep.jpg)",
              }}
            >
              <h2 className="font-bold">{t.title}</h2>
              <p className="mt-2 text-sm text-white/80">{t.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-brand-gold">Explore →</span>
            </Link>
          ))}
        </section>

        <section className="mt-14 rounded-3xl bg-[#12121e] p-8 text-white md:grid md:grid-cols-2 md:items-center md:gap-8 md:p-12">
          <div>
            <h2 className="text-2xl font-extrabold">Competition coaching</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Optional coaching for coding contests — mock rounds and strategy. Ask us what we currently run.
            </p>
          </div>
          <div className="mt-6 md:mt-0 md:text-right">
            <Link href="/contact" className="inline-flex rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-bold text-ink-800">
              Ask about competition coaching
            </Link>
          </div>
        </section>
        <CohortStrip />
      </div>
    </main>
  );
}
