import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import Link from "next/link";

export const metadata: Metadata = buildMetadata({
  title: "Resources — Study Guides, Exam Tips & Learning Guidance | YKAY",
  description:
    "Free learning resources from YKAY: study guides, exam preparation tips, curriculum guidance and subject advice for British and Nigerian learners.",
  path: "/resources",
});

const HUBS = [
  { href: "/blog", icon: "📝", title: "Study guides & blog", desc: "Subject and exam-tagged guides: IGCSE, WAEC, NECO, JAMB, IELTS and more." },
  { href: "/exam-prep", icon: "🎯", title: "Exam preparation", desc: "How our revision cohorts, mocks and past-paper practice work." },
  { href: "/digital-skills", icon: "💻", title: "Computing & digital skills", desc: "Computer Science, Python, AI and digital literacy pathways." },
  { href: "/curricula/british", icon: "🇬🇧", title: "British curriculum guide", desc: "Year 7–9, IGCSE and A-Level: levels, subjects and assessment support." },
  { href: "/curricula/nigerian", icon: "🇳🇬", title: "Nigerian curriculum guide", desc: "JSS and SSS pathways with WAEC, NECO and JAMB preparation." },
  { href: "/success-stories", icon: "🏆", title: "Success stories", desc: "Verified results, competition achievements and family stories." },
];

const TIPS = [
  { title: "Revision technique", body: "Active recall beats re-reading: close the book and write out what you remember, then check. Fifteen minutes of active recall outperforms an hour of highlighting." },
  { title: "Past questions first", body: "Map past questions to syllabus topics. The topics that appear most often are your highest-yield revision targets — spend your time there first." },
  { title: "Mock under real conditions", body: "Timed practice in a quiet room with no phone trains your brain for the real exam day. Review every mistake, not just the score." },
  { title: "Parents: ask for the report", body: "Progress reports turn tuition from 'a nice idea' into an accountable plan — attendance, notes and next steps every week." },
];

export default function ResourcesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://ykayvirtual.com/" },
    { name: "Resources", item: "https://ykayvirtual.com/resources" },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Resources" }]} />

      <div className="text-center max-w-3xl mx-auto">
        <p className="tag-handwritten">Learn how to learn</p>
        <h1 className="text-4xl md:text-5xl font-extrabold mt-2">Resources</h1>
        <p className="mt-4 text-ink-600">
          Study guides, exam tips and curriculum guidance — everything families need to make the
          right learning decisions.
        </p>
      </div>

      <section className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {HUBS.map((h) => (
          <Link key={h.href} href={h.href} className="border rounded-2xl p-6 hover:shadow-lift hover:border-brand-blue/40 transition-all">
            <div className="text-3xl">{h.icon}</div>
            <h2 className="font-bold mt-3">{h.title}</h2>
            <p className="mt-2 text-sm text-ink-600">{h.desc}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-brand-blue">Explore →</span>
          </Link>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold mb-6">Study tips from our tutors</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {TIPS.map((t) => (
            <div key={t.title} className="rounded-2xl bg-ink-50 border border-ink-100 p-6">
              <h3 className="font-bold">{t.title}</h3>
              <p className="mt-2 text-sm text-ink-700 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 text-center border rounded-3xl p-10">
        <h2 className="text-2xl font-extrabold">Want guided help?</h2>
        <p className="mt-2 text-ink-600 text-sm">
          A tutor turns these techniques into a weekly plan with accountability.
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Link href="/private-tuition" className="btn-primary">Book private tuition</Link>
          <Link href="/cohorts" className="btn-gold">Join a cohort</Link>
        </div>
      </section>
    </main>
  );
}
