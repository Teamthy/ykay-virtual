import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { HeroCarousel } from "@/components/layout/HeroCarousel";
import { CardCarousel } from "@/components/layout/CardCarousel";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { Star, Crown, UserCheck, Award, Check, ShieldCheck, Sparkles, Clock } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "YK-Virtual Plus - Premium Tutoring for International Learners | YK-Virtual",
  description:
    "Upgrade your child's learning with YK-Virtual Plus - priority matching with vetted specialist tutors and a dedicated advisor.",
  path: "/plus",
});

const HERO_SLIDES = [
  {
    eyebrow: "YK-Virtual Plus",
    title: "Advisor-led premium tutoring",
    subtitle: "Priority matching with a vetted specialist, a named advisor, and weekly reports. Premium packaging — not invented rankings.",
    cover: "/hero/plus.jpg",
    ctas: [
      { label: "Unlock Premium Tutoring", href: "/pricing", primary: true },
      { label: "How it works", href: "#how" },
    ],
  },
  {
    eyebrow: "Why families choose Plus",
    title: "Foreign-standard tutoring, local pricing",
    subtitle: "The quality of education families abroad pay thousands for — delivered by vetted Nigerian tutors on British and Nigerian curricula.",
    cover: "/hero/international.jpg",
    ctas: [{ label: "See the plans", href: "/pricing", primary: true }],
  },
];

const FEATURES = [
  { icon: <Crown size={20} />, title: "Vetted specialist tutors", desc: "Tutors who passed identity checks, interview and a subject competency assessment." },
  { icon: <UserCheck size={20} />, title: "Dedicated Learning Advisor", desc: "A single point of contact who manages your child's learning journey end-to-end." },
  { icon: <Award size={20} />, title: "Premium Curriculum & Materials", desc: "British and Nigerian curricula delivered with international-standard resources." },
];

const PERKS = [
  "Priority matching with vetted specialist tutors",
  "Personalised premium learning plans",
  "Priority scheduling and flexible rescheduling",
  "Weekly premium progress reports",
  "Verified, shareable completion certificates",
  "Recorded lessons + transcripts for review",
  "Higher AI-tutor allowance",
  "Priority support routing",
];

const STEPS = [
  { n: "1", t: "Book a discovery call", d: "Tell us your child's goals, level and schedule — we'll design a premium plan." },
  { n: "2", t: "Meet your tutor", d: "We match a vetted specialist to your child's goals and schedule." },
  { n: "3", t: "Track premium progress", d: "Weekly premium reports, live classes and priority support throughout." },
];

const TESTIMONIALS = [
  { quote: "The advisor checked in weekly and the reports kept us in the loop. My daughter's confidence in Maths transformed.", name: "Parent · Lagos" },
  { quote: "We got a specialist IGCSE tutor matched fast, and the recorded lessons meant revision before every exam.", name: "Parent · Abuja" },
  { quote: "Real vetted tutors and clear pricing — no invented rankings. Worth every naira.", name: "Parent · Port Harcourt" },
];

export default function YKVirtualPlusPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "YK-Virtual Plus", item: "https://virtual.ykaycollege.com/plus" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <HeroCarousel slides={HERO_SLIDES} />

      {/* Value prop */}
      <section className="bg-white py-16">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue-light px-4 py-1.5 text-xs font-bold text-brand-navy">
              <Star size={13} className="text-brand-gold" fill="currentColor" /> Premium matching and reporting
            </p>
            <h2 className="mt-5 font-display text-3xl tracking-[0.02em] text-brand-navy md:text-4xl">
              A complete premium learning experience
            </h2>
            <p className="mt-4 text-ink-600 leading-relaxed">
              YK-Virtual Plus bundles the advisor-led matching, premium materials and progress visibility into one
              subscription — designed for families who want white-glove support without an overseas price tag.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {PERKS.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface-muted p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-navy text-brand-gold">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-ink-800">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border-2 border-brand-gold bg-brand-gold-light p-6 text-center">
              <p className="font-display text-3xl tracking-[0.02em] text-brand-navy">Local pricing</p>
              <p className="mt-1 text-sm text-ink-600">Nigerian tutors — no invented discount percentage</p>
              <Link href="/pricing" className="mt-4 inline-block rounded-full bg-brand-gold px-8 py-3 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover">
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="bg-deep py-10 text-white">
        <div className="container-x grid gap-6 text-center sm:grid-cols-3">
          {[
            { icon: <ShieldCheck size={22} />, t: "Escrow-protected", d: "Your fee is held until the cohort delivers." },
            { icon: <Sparkles size={22} />, t: "Named advisor", d: "One person owns your learning journey." },
            { icon: <Clock size={22} />, t: "Priority scheduling", d: "Flexible rescheduling, near-term slots." },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl bg-white/5 p-5">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-gold text-ink-900">{b.icon}</div>
              <p className="mt-3 font-bold">{b.t}</p>
              <p className="mt-1 text-sm text-white/70">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-surface-muted py-16 scroll-mt-24">
        <div className="container-x">
          <h2 className="text-center font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">How YK-Virtual Plus works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-ink-100 bg-white p-7 text-center shadow-soft">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-navy font-display text-xl text-white">{s.n}</div>
                <h3 className="mt-4 font-bold text-ink-800">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial carousel */}
      <section className="py-16">
        <div className="container-x">
          <h2 className="text-center font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">Loved by families</h2>
          <div className="mt-10">
            <CardCarousel>
              {TESTIMONIALS.map((t) => (
                <div key={t.name} data-card className="w-[320px] shrink-0 snap-start rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
                  <div className="text-brand-gold" aria-hidden="true">★★★★★</div>
                  <p className="mt-3 text-sm text-ink-700">{t.quote}</p>
                  <p className="mt-4 text-sm font-bold text-ink-900">{t.name}</p>
                </div>
              ))}
            </CardCarousel>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
