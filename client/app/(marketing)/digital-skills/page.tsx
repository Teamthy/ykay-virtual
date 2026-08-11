import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CohortStrip } from "@/features/cohorts/components/CohortStrip";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Computing & Digital Skills — CS, Python, AI, Cybersecurity | YKAY",
  description:
    "Digital academy: Computer Science, ICT, Python programming, Artificial Intelligence, Cybersecurity and Microsoft Office certification preparation — cohorts and private tuition.",
  path: "/digital-skills",
});

const TRACKS = [
  { title: "Computer Science", desc: "IGCSE/SSS Computer Science with programming and theory.", icon: "💻", href: "/programmes" },
  { title: "ICT & Digital Literacy", desc: "Practical computing for school and the workplace.", icon: "🖥️", href: "/programmes" },
  { title: "Python Programming", desc: "From first programs to real projects.", icon: "🐍", href: "/programmes" },
  { title: "Artificial Intelligence", desc: "Concepts, tools and responsible AI use for students.", icon: "🤖", href: "/programmes" },
  { title: "Cybersecurity", desc: "Safe online habits, digital safety and security fundamentals.", icon: "🛡️", href: "/programmes" },
  { title: "Microsoft Office & Certification", desc: "Word, Excel, PowerPoint and certification prep.", icon: "📊", href: "/programmes" },
];

export default function DigitalSkillsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Digital Skills", item: "https://ykayvirtual.com/digital-skills" },
  ]);
  const course = courseJsonLd({
    name: "Computing & Digital Skills Academy",
    description: "Computer Science, ICT, Python, AI, Cybersecurity and Microsoft Office certification preparation.",
    provider: "YKAY Virtual School",
    url: "https://ykayvirtual.com/digital-skills",
  });

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Digital Skills" }]} />

      <section className="text-center max-w-3xl mx-auto">
        <p className="tag-handwritten">The digital academy</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mt-2">Computing & Digital Skills</h1>
        <p className="mt-4 text-ink-600">
          Computer Science, programming, artificial intelligence and digital safety — taught by
          educators who lead national and international computing programmes.
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/programmes" className="btn-primary">Browse computing programmes</Link>
          <Link href="/private-tuition" className="btn-gold">Book a coding tutor</Link>
        </div>
      </section>

      <section className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TRACKS.map((t) => (
          <Link key={t.title} href={t.href} className="border rounded-2xl p-6 hover:shadow-lift hover:border-brand-blue/40 transition-all">
            <div className="text-3xl">{t.icon}</div>
            <h2 className="font-bold mt-3">{t.title}</h2>
            <p className="mt-2 text-sm text-ink-600">{t.desc}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-brand-blue">Explore →</span>
          </Link>
        ))}
      </section>

      <section className="mt-14 rounded-3xl bg-[#12121e] text-white p-8 md:p-12 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-2xl font-extrabold">Competition & Olympiad support</h2>
          <p className="mt-3 text-white/75 text-sm leading-relaxed">
            Our computing team prepares learners for international technology competitions —
            including the International Coding Olympiad — with coaching, mock rounds and
            competition strategy.
          </p>
        </div>
        <div className="text-center md:text-right">
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-brand-gold text-ink-800 font-bold text-sm px-6 py-3.5 hover:brightness-105 transition-all">
            Ask about competition coaching
          </Link>
        </div>
      </section>
          <CohortStrip />
</main>
  );
}
