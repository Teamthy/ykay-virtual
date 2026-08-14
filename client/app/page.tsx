import { HeroSlider } from "@/components/home/HeroSlider";
import { StatsBand } from "@/components/home/StatsBand";
import { SuccessRateBand } from "@/components/home/SuccessRateBand";
import { ServicesShowcase } from "@/components/home/ServicesShowcase";
import { ApproachSection } from "@/components/home/ApproachSection";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { PopularProgrammes } from "@/features/programmes/components/PopularProgrammes";
import { UpcomingCohorts } from "@/features/cohorts/components/UpcomingCohorts";
import { TestimonialsSection } from "@/features/content/components/TestimonialsSection";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { ExamPrepGrid } from "@/components/home/ExamPrepGrid";
import { BecomeTutorCTA } from "@/components/home/BecomeTutorCTA";
import { DownloadAppCTA } from "@/components/home/DownloadAppCTA";
import { TravelAndCareBands } from "@/components/home/TravelAndCareBands";
import { AnnouncementVideo } from "@/components/home/AnnouncementVideo";
import { HowItWorksStrip } from "@/components/home/HowItWorksStrip";
import { HowItWorksVideo } from "@/components/home/HowItWorksVideo";
import { HomeFAQ } from "@/components/home/HomeFAQ";

// NUVORA home — Tuteria v2 structure: hero → popular services → stats →
// programmes/cohorts → how it works → "right way" partner → results (3x) →
// 5-step approach → testimonials → exam prep → FAQ → guarantee → tutor CTA.

export default function HomePage() {
  return (
    <>
      <HeroSlider />
      <ServicesShowcase />
      <StatsBand />
      <PopularProgrammes />
      <UpcomingCohorts />
      <HowItWorksStrip />
      <HowItWorksVideo />
      <ApproachSection />
      <TestimonialSlider />
      <AnnouncementVideo />
      <TestimonialsSection />
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
