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
    "Upgrade your child's learning with NUVORA Plus — priority matching with vetted specialist tutors and a dedicated advisor.",
  path: "/nuvora-plus",
});

const FEATURES = [
  {
    icon: <Crown size={20} />,
    title: "Vetted specialist tutors",
    desc: "Tutors who have passed identity checks, interview and a subject competency assessment.",
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
        cover="/hero/nuvora-plus.jpg"
        eyebrow="NUVORA Plus"
        title="NUVORA Plus — advisor-led matching"
        subtitle="Priority matching with a vetted specialist, a named advisor, and weekly reports. Premium packaging — not invented rankings."
        crumbs={[{ name: "Home", href: "/" }, { name: "NUVORA Plus" }]}
        align="center"
        image={{ src: "/hero/nuvora-plus.jpg", alt: "Tutor guiding a young learner one-on-one" }}
      >
        <a href="/pricing" className="btn-gold">Unlock Premium Tutoring</a>
      </PageHero>

      {/* Value prop — foreign-standard without the price tag */}
      <section className="bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light px-4 py-1.5 text-xs font-bold text-brand-navy">
              <Star size={13} className="text-brand-gold" fill="currentColor" />
              Premium matching and reporting
            </p>
            <h2 className="mt-5 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
              Foreign-Standard Tutoring without the Foreign Price Tag
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              Give your child the quality of education families abroad pay thousands for —
              delivered by vetted Nigerian tutors on British and Nigerian curricula.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Priority matching with vetted specialist tutors",
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
                className="rounded-full bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5"
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
              <p className="font-display text-3xl tracking-[0.02em] text-brand-navy">Local pricing</p>
              <p className="mt-1 text-sm text-ink-600">Nigerian tutors — no invented discount percentage</p>
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
              { n: "2", t: "Meet your tutor", d: "We match a vetted specialist to your child's goals and schedule." },
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
            <Link href="/pricing" className="inline-block rounded-full bg-brand-gold px-9 py-3.5 text-sm font-bold text-ink-900 transition-all hover:bg-brand-gold-hover hover:-translate-y-0.5">
              Unlock Premium Tutoring
            </Link>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
