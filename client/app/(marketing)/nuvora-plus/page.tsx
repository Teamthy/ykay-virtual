import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Star, Crown, UserCheck, Award, Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "NUVORA Plus — Premium Tutoring for International Learners | NUVORA",
  description:
    "Upgrade your child's learning with NUVORA Plus — the top 5% of tutors nationwide, foreign-standard tutoring without the foreign price tag.",
  path: "/nuvora-plus",
});

const FEATURES = [
  {
    icon: <Crown size={20} />,
    title: "Top 5% of Tutors Nationwide",
    desc: "Hand-picked, elite tutors with proven track records of outstanding results.",
  },
  {
    icon: <UserCheck size={20} />,
    title: "Dedicated Learning Advisor",
    desc: "A single point of contact who manages your child's learning journey end-to-end.",
  },
  {
    icon: <Award size={20} />,
    title: "Premium Curriculum & Materials",
    desc: "British and Nigerian curricula delivered with international-standard resources.",
  },
];

export default function NuvoraPlusPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "NUVORA Plus", item: "https://nuvora.com/nuvora-plus" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <PageHero
        eyebrow="Top 5% of Tutors Nationwide"
        title="Upgrade Your Child's Learning with NUVORA Plus"
        subtitle="Give your child the ultimate learning advantage with NUVORA Plus — our premium tutoring service designed for families who want the best."
        crumbs={[{ name: "Home", href: "/" }, { name: "NUVORA Plus" }]}
        align="center"
      >
        <a href="/contact" className="btn-gold">Unlock Premium Tutoring</a>
      </PageHero>

      {/* Value prop — foreign-standard without the price tag */}
      <section className="bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light px-4 py-1.5 text-xs font-bold text-brand-navy">
              <Star size={13} className="text-brand-gold" fill="currentColor" />
              Trusted by Families Across 4 Continents
            </p>
            <h2 className="mt-5 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
              Foreign-Standard Tutoring without the Foreign Price Tag
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Give your child the quality of education families abroad pay thousands for —
              delivered by top Nigerian tutors at up to 70% less than the cost of typical
              international tutoring.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Elite, hand-selected tutors from the top 5%",
                "Personalised premium learning plans",
                "Priority scheduling and flexible rescheduling",
                "Weekly premium progress reports",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://wa.me/447465654119?text=Hi+NUVORA%2C+I+want+to+book+a+NUVORA+Plus+tutoring+package+for+my+child"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-brand-navy px-8 py-4 text-sm font-bold text-white hover:bg-brand-blue transition-colors"
              >
                Book a Tutor Today
              </a>
              <a
                href="https://wa.me/447465654119"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-ink-200 px-8 py-4 text-sm font-bold text-ink-700 hover:bg-ink-100 transition-colors"
              >
                💬 Chat on WhatsApp
              </a>
            </div>
          </div>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface-muted p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-navy text-brand-gold">
                  {f.icon}
                </span>
                <div>
                  <h3 className="font-bold text-ink-800">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-brand-gold bg-brand-gold-light p-6 text-center">
              <p className="font-display text-3xl tracking-[0.02em] text-brand-navy">Up to 70% less</p>
              <p className="mt-1 text-sm text-ink-600">than typical international tutoring costs</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-muted py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl text-center">
            How NUVORA Plus works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { n: "1", t: "Book a discovery call", d: "Tell us your child's goals, level and schedule — we'll design a premium plan." },
              { n: "2", t: "Meet your elite tutor", d: "We hand-pick a top-5% tutor matched to your child's learning style." },
              { n: "3", t: "Track premium progress", d: "Weekly premium reports, live classes and priority support throughout." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-ink-100 bg-white p-7 text-center shadow-soft">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-navy font-display text-xl text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold text-ink-800">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/contact" className="inline-block rounded-xl bg-brand-navy px-9 py-4 text-sm font-bold text-white hover:bg-brand-blue transition-colors">
              Unlock Premium Tutoring
            </Link>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
