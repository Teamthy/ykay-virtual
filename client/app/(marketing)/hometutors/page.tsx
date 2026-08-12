import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { ArrowRight } from "lucide-react";
import { StatsBand } from "@/components/home/StatsBand";
import { LearningNeeds } from "@/components/home/LearningNeeds";
import { PartnerSection } from "@/components/home/PartnerSection";
import { ApproachSection } from "@/components/home/ApproachSection";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { TutorsShowcase } from "@/components/home/TutorsShowcase";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Home Tutoring — One-on-One Lessons with Vetted Tutors | NUVORA",
  description:
    "Get personalized home tutoring designed to guide your children toward exam success, boost their confidence, and get better school grades — with the top 1% of vetted tutors.",
  path: "/hometutors",
});

export default function HomeTutorsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Home Tutoring", item: "https://nuvora.com/hometutors" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Preline hero: announcement + gradient title + buttons */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-0 before:absolute before:inset-x-0 before:top-0 before:h-full before:bg-[radial-gradient(ellipse_at_top,rgba(244,180,0,0.10),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-14 md:px-10 md:pt-20">
          <div className="flex justify-center">
            <a
              href="/tutors"
              className="inline-flex items-center gap-x-2 rounded-full border border-ink-200 bg-white p-1 ps-3 text-sm text-ink-800 shadow-sm transition hover:border-brand-gold"
            >
              Home tutoring done right
              <span className="inline-flex items-center gap-x-2 rounded-full bg-brand-gold-light px-2.5 py-1.5 font-semibold text-brand-gold-dark">
                Top 1% of vetted tutors
              </span>
            </a>
          </div>

          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h1 className="font-display text-4xl tracking-[0.02em] text-ink-900 md:text-5xl lg:text-6xl">
              Better, Brighter{" "}
              <span className="bg-clip-text bg-gradient-to-tl from-brand-gold-dark to-brand-gold text-transparent">
                Future For Your Kids.
              </span>
            </h1>
          </div>

          <div className="mx-auto mt-5 max-w-3xl text-center">
            <p className="text-lg text-ink-600">
              Get personalized home tutoring that is designed to guide your children toward exam
              success, boost their confidence, and get better school grades.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <a
              href="/tutors"
              className="inline-flex items-center gap-x-3 rounded-md bg-gradient-to-tl from-brand-gold-dark to-brand-gold py-3 px-4 text-sm font-medium text-white transition-all hover:from-brand-gold hover:to-brand-gold-hover"
            >
              Get Started
              <ArrowRight size={16} />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-x-2 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
            >
              Learn how it works
            </a>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Vetted tutors:</span>
              <span className="text-sm font-bold text-ink-900">1%</span>
            </div>
            <svg className="hidden size-5 text-ink-300 sm:block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Success rate:</span>
              <span className="text-sm font-bold text-ink-900">98%</span>
            </div>
            <svg className="hidden size-5 text-ink-300 sm:block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Lessons delivered:</span>
              <span className="text-sm font-bold text-ink-900">280k+</span>
            </div>
          </div>
        </div>
      </section>

      <StatsBand />
      <LearningNeeds />
      <TutorsShowcase />
      <ApproachSection />
      <TestimonialSlider />
      <GuaranteeBand />
    </main>
  );
}
