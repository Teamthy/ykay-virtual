import { CategoryPills } from "@/components/home/CategoryPills";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { TrustLogos } from "@/components/home/TrustLogos";
import { CommunitySection } from "@/components/home/CommunitySection";
import { PartnerSection } from "@/components/home/PartnerSection";
import { ResultsSection } from "@/components/home/ResultsSection";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { ExamPrepGrid } from "@/components/home/ExamPrepGrid";
import { StudentQuote } from "@/components/home/StudentQuote";
import { TestPrepCard } from "@/components/home/TestPrepCard";
import { BecomeTutorCTA } from "@/components/home/BecomeTutorCTA";

export default function HomePage() {
  return (
    <>
      <CategoryPills />
      <HeroCarousel />
      <TrustLogos />
      <CommunitySection />
      <PartnerSection />
      <ResultsSection />
      <TestimonialSlider />
      <ExamPrepGrid />
      <StudentQuote />
      <TestPrepCard />
      <BecomeTutorCTA />
    </>
  );
}