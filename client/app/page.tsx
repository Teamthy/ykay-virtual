import { Reveal } from "@/components/ui/reveal";
import { HeroSplit } from "@/components/home/HeroSplit";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { PopularProgrammes } from "@/features/programmes/components/PopularProgrammes";
import { UpcomingCohorts } from "@/features/cohorts/components/UpcomingCohorts";
import { TestimonialSlider } from "@/components/home/TestimonialSlider";
import { CollegeBridge } from "@/components/home/CollegeBridge";
import { ExamPrepGrid } from "@/components/home/ExamPrepGrid";
import { BecomeTutorCTA } from "@/components/home/BecomeTutorCTA";
import { DownloadAppCTA } from "@/components/home/DownloadAppCTA";
import { HowItWorksStrip } from "@/components/home/HowItWorksStrip";
import { HomeFAQ } from "@/components/home/HomeFAQ";

// YK-Virtual home — hero (centered intro + service rail) → escrow →
// programmes → how it works → cohorts → exam prep → testimonials →
// campus → FAQ → app download → tutor CTA.
//
// Removed for being unverifiable/duplicative (round 19):
//   StatsBand        - invented "10k+ / 280k+ / 38k+ / 98%" + press logos
//   ApproachSection  - "3x better" claim + YK-Virtual Insights™, duplicated
//                      the how-it-works narrative
//   SuccessRateBand  - invented per-subject success rates (98/89/92%)
//   HeroSlider       - replaced by HeroSplit (static copy + image carousel)

export default function HomePage() {
  return (
    <>
      <HeroSplit />
      <Reveal delay={50} variant="zoom" className="w-full">
        <GuaranteeBand />
      </Reveal>
      <Reveal delay={50} variant="left" className="w-full">
        <PopularProgrammes />
      </Reveal>
      <Reveal delay={50} variant="right" className="w-full">
        <HowItWorksStrip />
      </Reveal>
      <Reveal delay={50} variant="up" className="w-full">
        <UpcomingCohorts />
      </Reveal>
      <Reveal delay={50} variant="blur" className="w-full">
        <ExamPrepGrid />
      </Reveal>
      <Reveal delay={50} variant="zoom" className="w-full">
        <TestimonialSlider />
      </Reveal>
      <Reveal delay={50} variant="left" className="w-full">
        <CollegeBridge />
      </Reveal>
      <Reveal delay={50} variant="right" className="w-full">
        <HomeFAQ />
      </Reveal>
      <Reveal delay={50} variant="blur" className="w-full">
        <DownloadAppCTA />
      </Reveal>
      <Reveal delay={50} variant="up" className="w-full">
        <BecomeTutorCTA />
      </Reveal>
    </>
  );
}
