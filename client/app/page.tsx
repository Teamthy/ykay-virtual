import { CategoryPills } from "@/components/home/CategoryPills";
import { HeroReference } from "@/components/home/HeroReference";
import { StatsBand } from "@/components/home/StatsBand";
import { SuccessRateBand } from "@/components/home/SuccessRateBand";
import { HeroSearch } from "@/features/programmes/components/HeroSearch";
import { PopularProgrammes } from "@/features/programmes/components/PopularProgrammes";
import { UpcomingCohorts } from "@/features/cohorts/components/UpcomingCohorts";
import { TestimonialsSection } from "@/features/content/components/TestimonialsSection";
import { TrustLogos } from "@/components/home/TrustLogos";
import { CommunitySection } from "@/components/home/CommunitySection";
import { PartnerSection } from "@/components/home/PartnerSection";
import { ResultsSection } from "@/components/home/ResultsSection";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { ExamPrepGrid } from "@/components/home/ExamPrepGrid";
import { StudentQuote } from "@/components/home/StudentQuote";
import { TestPrepCard } from "@/components/home/TestPrepCard";
import { BecomeTutorCTA } from "@/components/home/BecomeTutorCTA";
import { LeadershipTeaser } from "@/components/home/LeadershipTeaser";
import { HowItWorksStrip } from "@/components/home/HowItWorksStrip";
import { HomeFAQ } from "@/components/home/HomeFAQ";

export default function HomePage() {
  return (
    <>
      <CategoryPills />
      <HeroReference />
      <StatsBand />
      <div className="container-x -mt-10 relative z-20">
        <HeroSearch />
      </div>
      <TrustLogos />
      <PopularProgrammes />
      <UpcomingCohorts />
      <HowItWorksStrip />
      <CommunitySection />
      <PartnerSection />
      <ResultsSection />
      <TestimonialsSection />
      <ExamPrepGrid />
      <StudentQuote />
      <TestPrepCard />
      <SuccessRateBand />
      <LeadershipTeaser />
      <HomeFAQ />
      <BecomeTutorCTA />
    </>
  );
}
