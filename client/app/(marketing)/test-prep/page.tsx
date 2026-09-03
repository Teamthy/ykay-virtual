import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { GraduationCap, Languages, FileCheck } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Test Prep - GMAT, GRE, SAT | YK-Virtual",
  description:
    "Structured prep for GMAT, GRE, SAT and ACT with vetted tutors. Same login as the rest of YK-Virtual - works on mobile.",
  path: "/test-prep",
});

const TESTS = [
  { code: "GMAT", name: "Graduate Management Admission Test", href: "/gmat" },
  { code: "GRE", name: "Graduate Record Examinations", href: "/gre" },
  { code: "SAT", name: "Scholastic Assessment Test", href: "/sat" },
  { code: "ACT", name: "American College Testing", href: "/sat" },
];

export default function TestPrepPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "Test Prep", item: "https://virtual.ykaycollege.com/test-prep" },
  ]);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PageHero
        announcement="Same login on phone and desktop"
        title="Get expert help to ace your exam"
        subtitle="GMAT, GRE, SAT and ACT - structured sessions, mocks and weekly reports. Prep lives on virtual.ykaycollege.com, not a separate site."
        ctas={[
          { label: "Browse tests", href: "#tests", primary: true },
          { label: "GMAT prep", href: "/gmat" },
        ]}
        image={{
          src: "/hero/test-prep.jpg",
          alt: "Student preparing for an international test",
        }}
      />

      <section id="tests" className="scroll-mt-28 bg-white py-16">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {TESTS.map((t) => (
              <Link
                key={t.code}
                href={t.href}
                className="group rounded-2xl border border-ink-100 bg-surface-muted p-6 text-center transition hover:-translate-y-1 hover:shadow-card"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-brand-blue shadow-soft group-hover:bg-brand-navy group-hover:text-white">
                  {t.code === "GMAT" || t.code === "GRE" ? (
                    <GraduationCap size={20} />
                  ) : t.code === "SAT" || t.code === "ACT" ? (
                    <FileCheck size={20} />
                  ) : (
                    <Languages size={20} />
                  )}
                </div>
                <div className="mt-4 font-display text-2xl text-brand-navy">
                  {t.code}
                </div>
                <p className="mt-1 text-xs font-semibold text-ink-500">
                  {t.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-navy py-14 text-white">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <h2 className="font-display text-3xl tracking-[0.02em]">
            How YK-Virtual prep works - on mobile too
          </h2>
          <p className="mt-3 max-w-2xl text-white/75">
            One account. Open this site on your phone for live lessons,
            recordings and reports - no extra subdomain or second login.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              "Diagnostic + a written study plan",
              "Live lessons you can rewatch on your phone",
              "Timed mocks with marked feedback",
              "Weekly progress notes for parents",
            ].map((f) => (
              <p key={f} className="rounded-xl bg-white/10 px-4 py-3 text-sm">
                {f}
              </p>
            ))}
          </div>
          <Link
            href="/private-tuition"
            className="mt-8 inline-block rounded-xl bg-brand-gold px-8 py-4 text-sm font-bold text-ink-900"
          >
            Request a test-prep tutor
          </Link>
        </div>
      </section>
      <GuaranteeBand />
    </main>
  );
}
