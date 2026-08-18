import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { LearningNeeds } from "@/components/home/LearningNeeds";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { TutorsShowcase } from "@/components/home/TutorsShowcase";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "Home Tutoring - One-on-One Lessons with Vetted Tutors | NUVORA",
  description:
    "Personalized home tutoring with vetted tutors - exam prep, confidence, and better school grades.",
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

      {/* Hero - PrebuiltUI template */}
      <PageHero
        announcement="Home tutoring · Vetted tutors"
        title="Better, Brighter Future For Your Kids."
        subtitle="Get personalized home tutoring that is designed to guide your children toward exam success, boost their confidence, and get better school grades."
        ctas={[
          { label: "Get Started", href: "/tutors", primary: true },
          { label: "Learn how it works", href: "#how" },
        ]}
        image={{ src: "/hero/home-tutoring.jpg", alt: "Tutor helping a young student at home" }}
      />

      <LearningNeeds />
      <TutorsShowcase />
      <TestimonialSlider />
      <GuaranteeBand />
    </main>
  );
}
