import Link from "next/link";
import { ArrowRight, Play, ShieldCheck, BadgeCheck, CalendarCheck } from "lucide-react";
import { HomePillNav } from "./HomePillNav";
import { HeroLearnerCarousel } from "./HeroLearnerCarousel";

const AVATARS = [
  "/tutors/chinasa.jpg",
  "/tutors/judith.jpg",
  "/tutors/olanike.jpg",
];

/** Verifiable trust points — no invented ratings or family counts. */
const TRUST = [
  { icon: BadgeCheck, label: "Vetted tutors" },
  { icon: ShieldCheck, label: "Escrow-protected payments" },
  { icon: CalendarCheck, label: "Live + recorded lessons" },
];

function HeroBadge() {
  return (
    <div className="hero-anim inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2A1A] shadow-sm">
      <span className="size-2 rounded-full bg-[#D6FF57] animate-pulse" />
      Live. Vetted. Personal.
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-[#F9F6ED]">
      {/* minimal background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[25%] top-[5%] h-[60%] w-[50%] rounded-full bg-[#D6FF57]/15 blur-[100px]" />
        <div className="absolute -right-[20%] bottom-[20%] h-[50%] w-[40%] rounded-full bg-[#0F2A1A]/5 blur-[80px]" />
      </div>

      <HomePillNav />

      {/* content - centered, minimal */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1920px] flex-col items-center px-4 pt-28 text-center sm:px-6 sm:pt-32 lg:px-8 lg:pt-36 xl:px-12 2xl:px-16">
        <HeroBadge />

        {/* Two-line headline, bold body face (DM Sans), not a display face. */}
        <h1 className="hero-anim hero-anim--1 mt-6 max-w-[20ch] font-body text-[clamp(2.6rem,7vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.02em] text-[#0F2A1A]">
          <span className="block">Learning solutions</span>
          <span className="block">for every student</span>
        </h1>

        <p className="hero-anim hero-anim--2 mt-5 max-w-[56ch] text-[15px] leading-[1.6] text-[#0F2A1A]/65 md:text-[16px]">
          British and Nigerian curricula, exam preparation, private tuition and live cohorts — taught by vetted tutors, protected by escrow.
        </p>

        <div className="hero-anim hero-anim--2 mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link href="/hometutors#booking" className="group inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-7 py-3.5 text-[13px] font-bold text-white transition hover:bg-black">
            Book a Home Tutor <span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A] group-hover:translate-x-0.5 transition"><ArrowRight size={14} /></span>
          </Link>
          <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-7 py-3.5 text-[13px] font-bold text-[#0F2A1A] hover:bg-black/[0.04]">
            <span className="grid size-6 place-items-center rounded-full border border-black/10"><Play size={10} className="fill-[#0F2A1A] ml-0.5" /></span> Watch Demo
          </Link>
        </div>

        {/* Verifiable trust messaging replaces the old rating/count chip. */}
        <div className="hero-anim hero-anim--3 mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-black/10 bg-white px-4 py-2 shadow-sm">
          <div className="mr-1 flex -space-x-2">
            {AVATARS.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s} src={s} alt="" className="size-7 rounded-full border-2 border-white object-cover" />
            ))}
          </div>
          {TRUST.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0F2A1A]">
              <t.icon size={13} aria-hidden="true" className="text-[#0F2A1A]/60" />
              {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* stage - the learner circle becomes a carousel (geometry unchanged) */}
      <HeroLearnerCarousel />

      {/* breathing room before the next section */}
      <div aria-hidden="true" className="h-6" />
    </section>
  );
}
