import Link from "next/link";
import { ArrowRight, Play, Zap, ShieldCheck, Users, Star, GraduationCap, Video, CheckCircle2 } from "lucide-react";
import { HomePillNav } from "./HomePillNav";

const AVATARS = [
  "/tutors/chinasa.jpg",
  "/tutors/judith.jpg",
  "/tutors/olanike.jpg",
  "/tutors/adewale.jpg",
  "/tutors/oluwatobi.jpg",
];

function HeroBadge() {
  return (
    <p className="hero-anim inline-flex items-center gap-2 rounded-full border border-deep/10 bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-deep shadow-sm motion-reduce:animate-none">
      <span className="grid size-5 place-items-center rounded-full bg-primary text-deep">
        <Zap size={11} className="fill-deep" aria-hidden="true" />
      </span>
      British & Nigerian Curricula · Live & Recorded
    </p>
  );
}

function HeroHeadline() {
  return (
    <h1 className="hero-anim hero-anim--1 mt-5 text-balance font-display text-[clamp(2.2rem,7vw,3.2rem)] font-normal leading-[0.9] tracking-[-0.03em] text-deep motion-reduce:animate-none sm:text-[clamp(2.8rem,5.2vw,4.2rem)] lg:text-[clamp(3.6rem,4.8vw,5rem)]">
      <span className="block">Learning that</span>
      <span className="block">
        <span className="relative inline-block">
          actually
          <span className="absolute bottom-1 left-0 -z-10 h-[14px] w-full bg-primary/70" />
        </span>{" "}
        delivers
      </span>
      <span className="block text-[0.85em] tracking-[-0.02em] text-ink-600 font-body font-bold mt-1">for every student, everywhere</span>
    </h1>
  );
}

function HeroSub() {
  return (
    <p className="hero-anim hero-anim--2 mt-5 max-w-[640px] text-[15px] leading-[1.7] text-ink-600 motion-reduce:animate-none md:text-[16px]">
      Vetted expert tutors, escrow-protected payments, live cohorts with recordings, assignments and parent reports. From JSS to SS3, UTME to IGCSE — structured learning that builds real results.
    </p>
  );
}

function HeroCtas() {
  return (
    <div className="hero-anim hero-anim--2 mt-7 flex w-full max-w-md flex-col items-stretch gap-3 motion-reduce:animate-none sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
      <Link
        href="/hometutors#booking"
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-deep px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-black hover:-translate-y-0.5"
      >
        Book a Home Tutor
        <span className="grid size-6 place-items-center rounded-full bg-primary text-deep transition group-hover:translate-x-0.5">
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Link>
      <Link
        href="/how-it-works"
        className="inline-flex items-center justify-center gap-2 rounded-full border border-deep/15 bg-white px-8 py-4 text-sm font-bold text-deep shadow-sm transition hover:bg-ink-50 hover:-translate-y-0.5"
      >
        <span className="grid size-6 place-items-center rounded-full border border-deep/15">
          <Play size={11} className="ms-[1px] fill-deep" />
        </span>
        How it works
      </Link>
    </div>
  );
}

function HeroSocialProof() {
  return (
    <div className="hero-anim hero-anim--3 mt-8 flex flex-wrap items-center justify-center gap-4 motion-reduce:animate-none">
      <div className="flex items-center gap-3 rounded-full border border-deep/10 bg-white px-4 py-2 shadow-sm">
        <div className="flex -space-x-2">
          {AVATARS.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" aria-hidden="true" className="size-7 rounded-full border-2 border-white bg-ink-100 object-cover" />
          ))}
        </div>
        <div className="text-left">
          <p className="flex items-center gap-1 text-[12px] font-bold text-deep">
            <Star size={12} className="fill-amber-400 text-amber-400" /> 4.9/5 parent rating
          </p>
          <p className="text-[11px] text-ink-500">3,000+ families enrolled</p>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 rounded-full bg-deep px-4 py-2 text-white">
        <ShieldCheck size={14} className="text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wide">Escrow protected · Verified tutors</span>
      </div>
    </div>
  );
}

/* New professional floating cards — replacing Wallet Balance / Google rating */

function TutorsCard() {
  return (
    <div className="rounded-[20px] border border-deep/10 bg-white p-4 shadow-[0_16px_40px_rgba(1,57,32,0.12)] w-[260px]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-deep px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <Users size={10} /> Vetted
        </span>
        <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wide">Live now</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-primary text-deep font-bold">500+</div>
        <div>
          <p className="text-[13px] font-bold leading-tight text-deep">Expert tutors</p>
          <p className="text-[11px] text-ink-500 leading-tight">British & Nigerian curricula</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {["Maths", "English", "Science"].map((s) => (
          <span key={s} className="rounded-full bg-ink-50 px-2.5 py-1 text-[10px] font-semibold text-ink-600">{s}</span>
        ))}
      </div>
    </div>
  );
}

function LiveClassCard() {
  return (
    <div className="rounded-[20px] border border-deep/10 bg-deep p-4 shadow-[0_16px_40px_rgba(1,57,32,0.18)] w-[280px] text-white">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-deep">
          <span className="size-1.5 rounded-full bg-deep animate-pulse" /> Live
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/60">
          <Video size={10} /> Cohort
        </span>
      </div>
      <p className="mt-3 font-display text-[18px] leading-[1]">SS2 Physics · WASSCE Prep</p>
      <p className="mt-1 text-[11px] text-white/60">Today 4:00 PM · 24 students · 6 seats left</p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div className="h-full w-[78%] rounded-full bg-primary" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white/70">78% filled</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-deep">
          Join live <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}

function TrustCard() {
  return (
    <div className="rounded-[20px] border border-deep/10 bg-white p-4 shadow-[0_16px_40px_rgba(1,57,32,0.12)] w-[240px]">
      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-full bg-primary text-deep">
          <ShieldCheck size={14} />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-deep">Trusted & protected</p>
      </div>
      <div className="mt-3 space-y-2">
        {[
          "Escrow-protected payments",
          "Parent reports & attendance",
          "Certificates & progress",
        ].map((t) => (
          <div key={t} className="flex items-center gap-2 text-[12px] font-medium text-ink-700">
            <CheckCircle2 size={14} className="text-primary-dark" /> {t}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
          ))}
        </div>
        <span className="text-[11px] font-bold text-deep">4.9/5 from parents</span>
      </div>
    </div>
  );
}

function CollegeBadge() {
  return (
    <div className="flex items-center gap-2.5 rounded-full border border-deep/10 bg-white px-4 py-2.5 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/mark.png" alt="" className="size-8 rounded-lg object-contain" />
      <div className="text-left leading-[1.1]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Powered by</p>
        <p className="text-[13px] font-bold text-deep flex items-center gap-1">
          <GraduationCap size={12} /> Ykay College
        </p>
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate w-full overflow-hidden bg-[#FFFEF8]">
      {/* subtle grid + glows */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(to right, #013920 1px, transparent 1px), linear-gradient(to bottom, #013920 1px, transparent 1px)`, backgroundSize: '72px 72px' }} />
        <div className="absolute -left-[20%] top-[10%] h-[50%] w-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-[15%] top-[30%] h-[40%] w-[40%] rounded-full bg-deep/5 blur-[100px]" />
      </div>

      <HomePillNav />

      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col items-center px-4 pt-28 text-center sm:px-6 sm:pt-32 lg:pt-36">
        <HeroBadge />
        <HeroHeadline />
        <HeroSub />
        <HeroCtas />
        <HeroSocialProof />
      </div>

      {/* stage — pastel circle + learner */}
      <div className="relative z-[5] mx-auto mt-10 h-[min(78vw,380px)] w-full max-w-[1500px] overflow-hidden sm:h-[min(56vw,520px)] lg:mt-12 lg:h-[min(48vw,720px)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 aspect-square w-[min(92vw,460px)] -translate-x-1/2 overflow-hidden rounded-full sm:w-[min(66vw,620px)] lg:w-[min(60vw,900px)]"
        >
          <div className="absolute inset-0 rounded-full bg-[#D9F1C6]" />
          <div className="absolute inset-x-0 top-[5%] h-[99%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/hero-student.png"
              alt=""
              className="hero-anim hero-anim--1 mx-auto block h-full w-auto max-w-none object-contain object-top mix-blend-multiply motion-reduce:animate-none"
            />
          </div>
        </div>

        {/* floating cards — new professional ones */}
        <div className="absolute left-1/2 top-0 aspect-square w-[min(92vw,460px)] -translate-x-1/2 sm:w-[min(66vw,620px)] lg:w-[min(60vw,900px)]">
          <div className="absolute left-[16%] top-[18%] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="animate-hero-float motion-reduce:animate-none">
              <CollegeBadge />
            </div>
          </div>
          <div className="absolute left-[102%] top-[38%] z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <div className="animate-hero-float-slow motion-reduce:animate-none">
              <LiveClassCard />
            </div>
          </div>
          <div className="absolute left-[10%] top-[58%] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="animate-hero-float [animation-delay:0.6s] motion-reduce:animate-none">
              <TutorsCard />
            </div>
          </div>
          <div className="absolute left-[88%] top-[72%] z-10 hidden -translate-x-1/2 -translate-y-1/2 xl:block">
            <div className="animate-hero-float [animation-delay:0.3s] motion-reduce:animate-none">
              <TrustCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
