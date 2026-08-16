import { HeroSlider } from "@/components/home/HeroSlider";
import { StatsBand } from "@/components/home/StatsBand";
import { SuccessRateBand } from "@/components/home/SuccessRateBand";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { ApproachSection } from "@/components/home/ApproachSection";
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

// NUVORA home — one deliberate narrative, no filler:
// hero → services → social proof → catalogue → how it works → approach →
// testimonials → exam prep → results → travel/care → FAQ → guarantee →
// app download → tutor CTA.
//
// Removed (duplicate/placeholder): HowItWorksVideo + AnnouncementVideo
// (both linked to a YouTube *search-results* placeholder URL) and
// TestimonialsSection (duplicate of the carousel — both hit the same
// consent-gated /content/testimonials endpoint).

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <ServicesShowcase />
      <StatsBand />
      <PopularProgrammes />
      <UpcomingCohorts />
      <HowItWorksStrip />
      <ApproachSection />
      <TestimonialSlider />
      <ExamPrepGrid />
      <SuccessRateBand />
      <TravelAndCareBands />
      <HomeFAQ />
      <GuaranteeBand />
      <DownloadAppCTA />
      <BecomeTutorCTA />
    </>
  );
}
