import { HeroSplit } from "@/components/home/HeroSplit";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { PopularProgrammes } from "@/features/programmes/components/PopularProgrammes";
import { UpcomingCohorts } from "@/features/cohorts/components/UpcomingCohorts";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { ExamPrepGrid } from "@/components/home/ExamPrepGrid";
import { BecomeTutorCTA } from "@/components/home/BecomeTutorCTA";
import { DownloadAppCTA } from "@/components/home/DownloadAppCTA";
import { TravelAndCareBands } from "@/components/home/TravelAndCareBands";
import { HowItWorksStrip } from "@/components/home/HowItWorksStrip";
import { HomeFAQ } from "@/components/home/HomeFAQ";

// NUVORA home — 12 sections, one narrative:
// hero (split: brand story + image carousel) → services → programmes →
// cohorts → how it works → testimonials → exam prep → guarantee →
// travel/care → FAQ → app download → tutor CTA.
//
// Removed for being unverifiable/duplicative (round 19):
//   StatsBand        — invented "10k+ / 280k+ / 38k+ / 98%" + press logos
//   ApproachSection  — "3x better" claim + NUVORA Insights™, duplicated
//                      the how-it-works narrative
//   SuccessRateBand  — invented per-subject success rates (98/89/92%)
//   HeroSlider       — replaced by HeroSplit (static copy + image carousel)

export default function HomePage() {
  return (
    <>
      <HeroSplit />
      <ServicesShowcase />
      <PopularProgrammes />
      <UpcomingCohorts />
      <HowItWorksStrip />
      <TestimonialSlider />
      <ExamPrepGrid />
      <GuaranteeBand />
      <TravelAndCareBands />
      <HomeFAQ />
      <DownloadAppCTA />
      <BecomeTutorCTA />
    </>
  );
}
