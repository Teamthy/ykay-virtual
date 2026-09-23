import Link from "next/link";
import { ArrowRight, Play, Star } from "lucide-react";
import { HomePillNav } from "./HomePillNav";

const AVATARS = [
  "/tutors/chinasa.jpg",
  "/tutors/judith.jpg",
  "/tutors/olanike.jpg",
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
    <section className="relative isolate w-full overflow-hidden bg-[#FFFEF8]">
      {/* minimal background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[25%] top-[5%] h-[60%] w-[50%] rounded-full bg-[#D6FF57]/15 blur-[100px]" />
        <div className="absolute -right-[20%] bottom-[20%] h-[50%] w-[40%] rounded-full bg-[#0F2A1A]/5 blur-[80px]" />
      </div>

      <HomePillNav />

      {/* content - centered, minimal */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 pt-28 text-center sm:px-6 sm:pt-32 lg:pt-36">
        <HeroBadge />

        <h1 className="hero-anim hero-anim--1 mt-6 max-w-[14ch] text-balance font-display text-[clamp(2.4rem,6.5vw,4.4rem)] leading-[0.88] tracking-[-0.03em] text-[#0F2A1A]">
          Comprehensive Learning Solutions for Every Student
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

        <div className="hero-anim hero-anim--3 mt-7 flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-2 shadow-sm">
          <div className="flex -space-x-2">
            {AVATARS.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s} src={s} alt="" className="size-7 rounded-full border-2 border-white object-cover" />
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0F2A1A]">
            <Star size={12} className="fill-amber-400 text-amber-400" /> 4.9/5
            <span className="font-medium text-[#0F2A1A]/50">· 3k+ families</span>
          </div>
        </div>
      </div>

      {/* stage - single circle + learner, no extra cards */}
      <div className="relative z-[5] mx-auto mt-10 h-[min(72vw,380px)] w-full max-w-[1200px] overflow-hidden sm:h-[min(52vw,480px)] lg:h-[min(42vw,560px)]">
        <div aria-hidden="true" className="absolute left-1/2 top-0 aspect-square w-[min(88vw,420px)] -translate-x-1/2 overflow-hidden rounded-full sm:w-[min(62vw,560px)] lg:w-[min(52vw,720px)]">
          <div className="absolute inset-0 rounded-full bg-[#D9F1C6]" />
          <div className="absolute inset-x-0 top-[4%] h-[98%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/home/hero-student.png" alt="" className="mx-auto block h-full w-auto object-contain object-top mix-blend-multiply" />
          </div>
        </div>
      </div>
    </section>
  );
}
