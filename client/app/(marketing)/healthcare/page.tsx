import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { HeartPulse, Stethoscope, Globe2, GraduationCap, Check } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Healthcare Assistant Training — Work in Care Worldwide | NUVORA",
  description:
    "Become a certified caregiver and work in care worldwide — HCA training with hands-on practicals and clinical internship. 180+ students enrolled.",
  path: "/healthcare",
});

export default function HealthcarePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Healthcare Training", item: "https://nuvora.com/healthcare" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <PageHero
        eyebrow="HCA Training · 180+ Students Enrolled"
        title="Become a Certified Caregiver, Work In Care Worldwide"
        subtitle="Get trained and certified as a Healthcare Assistant with hands-on practicals and clinical internship."
        crumbs={[{ name: "Home", href: "/" }, { name: "Healthcare Training" }]}
        align="center"
      >
        <a href="https://wa.me/2349118276725" target="_blank" rel="noreferrer" className="btn-gold">
          Join the Training
        </a>
        <a
          href="https://wa.me/2349118276725"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-white/40 px-8 py-4 text-sm font-bold text-white hover:bg-white/10 transition-colors"
        >
          💬 Chat on WhatsApp
        </a>
      </PageHero>

      <section className="bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { v: "180+", l: "Students enrolled" },
                { v: "UK", l: "Care pathways" },
                { v: "100%", l: "Hands-on practicals" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-ink-100 bg-surface-muted p-6 text-center">
                  <p className="font-display text-3xl tracking-[0.02em] text-brand-navy">{s.v}</p>
                  <p className="mt-1 text-xs font-semibold text-ink-500">{s.l}</p>
                </div>
              ))}
            </div>
            <h2 className="mt-8 font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
              A clear path into global care careers
            </h2>
            <p className="mt-3 text-ink-600 leading-relaxed">
              Our Healthcare Assistant programme combines classroom training, hands-on
              practicals and a supervised clinical internship — preparing you for care roles
              in Nigeria and abroad.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Certified HCA curriculum with practical assessment",
                "Clinical internship placement support",
                "Guidance for international care pathways (UK, Canada)",
                "Flexible evening and weekend cohorts",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            {[
              { icon: <Stethoscope size={20} />, t: "Hands-on Practicals", d: "Real-world care skills — personal care, mobility, observations and record-keeping." },
              { icon: <GraduationCap size={20} />, t: "Certification", d: "Graduate with an HCA certificate recognised by care employers." },
              { icon: <Globe2 size={20} />, t: "Work In Care Worldwide", d: "Pathways to care work in the UK, Canada and beyond." },
              { icon: <HeartPulse size={20} />, t: "Clinical Internship", d: "Supervised placement that turns training into confidence." },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface-muted p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-green text-white">
                  {f.icon}
                </span>
                <div>
                  <h3 className="font-bold text-ink-800">{f.t}</h3>
                  <p className="mt-1 text-sm text-ink-500 leading-relaxed">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
