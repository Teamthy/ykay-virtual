import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
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

      <PageHero
        eyebrow="Trusted by 9000+ Parents"
        title="Better, Brighter Future For Your Kids."
        subtitle="Get personalized home tutoring that is designed to guide your children toward exam success, boost their confidence, and get better school grades."
        crumbs={[{ name: "Home", href: "/" }, { name: "Home Tutoring" }]}
        align="center"
      >
        <a href="/tutors" className="btn-gold">Get Started</a>
        <a href="#how" className="px-8 py-4 rounded-lg border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-colors">
          Learn how it works
        </a>
      </PageHero>

      <StatsBand />
      <LearningNeeds />
      <TutorsShowcase />
      <ApproachSection />
      <TestimonialSlider />
      <GuaranteeBand />
    </main>
  );
}
