import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  Play,
  Plus,
  RefreshCw,
  Star,
  Zap,
} from "lucide-react";
import { HomePillNav } from "./HomePillNav";

/**
 * Homepage hero — reference redesign (round 22). Floating dark pill nav on a
 * faint graph grid; centred badge → headline → subtext → CTA pair → trust
 * row; below, a pastel stage circle (cropped by the section edge) with a
 * cut-out learner and three floating cards pinned to the rim (Powered by
 * Ykay College · Wallet balance · Google rating). Entrance motion honours
 * prefers-reduced-motion.
 *
 * Reference geometry (767px shot): pill ≈ 68% wide · headline 2 lines ·
 * circle ≈ 60vw with ~80% of its height visible · learner head just under
 * the circle crown, body cropped at the section edge · cards centred on the
 * rim at (19%, 20%) / (99%, 41%) / (14%, 56%) of the circle box.
 *
 * NOTE: entrance animations animate `transform` — never combine them with
 * translate utilities on the same element (the animation fill overrides the
 * utility). Positioning wrappers stay animation-free for that reason.
 */

const AVATARS = [
  "/tutors/chinasa.jpg",
  "/tutors/judith.jpg",
  "/tutors/olanike.jpg",
  "/tutors/adewale.jpg",
  "/tutors/oluwatobi.jpg",
];

function HeroBadge() {
  return (
    <p className="hero-anim inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] motion-reduce:animate-none">
      <Zap size={11} className="fill-primary-dark text-primary-dark" aria-hidden="true" />
      Live. Vetted. Personal.
    </p>
  );
}

function HeroHeadline() {
  return (
    <h1 className="hero-anim hero-anim--1 mt-4 text-balance font-body text-[clamp(2.1rem,7.4vw,2.9rem)] font-bold leading-[1.09] tracking-[-0.02em] [color:var(--home-ink)] motion-reduce:animate-none sm:text-[clamp(2.6rem,5vw,3.9rem)] lg:text-[clamp(3.4rem,4.7vw,4.35rem)]">
      <span className="lg:block lg:whitespace-nowrap">Comprehensive Learning</span>{' '}
      <span className="lg:block lg:whitespace-nowrap">Solutions for Every Student</span>
    </h1>
  );
}

function HeroSub() {
  return (
    <p className="hero-anim hero-anim--2 mt-4 max-w-[640px] text-[15px] leading-relaxed text-ink-600 motion-reduce:animate-none md:text-base">
      The easiest and fastest way to learn with expert tutors — British and
      Nigerian curricula, exam preparation, private tuition and live cohorts
      for students worldwide.
    </p>
  );
}

function HeroCtas() {
  return (
    <div className="hero-anim hero-anim--2 mt-6 flex w-full max-w-md flex-col items-stretch gap-3 motion-reduce:animate-none sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
      <Link
        href="/hometutors#booking"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-bold text-deep-green transition hover:bg-primary-hover"
      >
        Book a Home Tutor
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
      <Link
        href="/how-it-works"
        className="inline-flex items-center justify-center gap-2.5 rounded-full border border-black/10 bg-white px-8 py-4 text-sm font-bold [color:var(--home-ink)] transition hover:bg-ink-50"
      >
        Watch Demo
        <span
          aria-hidden="true"
          className="grid size-5 place-items-center rounded-full border-[1.5px] border-current"
        >
          <Play size={9} className="ms-[1px] fill-current" />
        </span>
      </Link>
    </div>
  );
}

function HeroTrust() {
  return (
    <div className="hero-anim hero-anim--3 mt-6 flex items-center justify-center gap-2.5 motion-reduce:animate-none">
      <div className="flex -space-x-2.5">
        {AVATARS.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            className="size-7 rounded-full border-2 border-white bg-ink-100 object-cover"
          />
        ))}
      </div>
      <p className="text-[13px] font-medium [color:var(--home-ink-muted)]">
        Trusted by 3k+ Students Globally
      </p>
    </div>
  );
}

/** "Backed by Techstars." analogue — the Ykay College family badge. */
function PoweredCard() {
  return (
    <div className="home-chip home-chip--round flex items-center gap-2.5 px-4 py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mark.png"
        alt=""
        className="size-8 rounded-lg object-contain"
      />
      <p className="text-[12px] leading-[1.3]">
        <span className="block font-medium [color:var(--home-ink-muted)]">
          Powered by
        </span>
        <span className="block font-bold [color:var(--home-ink)]">
          Ykay College.
        </span>
      </p>
    </div>
  );
}

/** Wallet-balance mock — mirrors the reference card, in YK-Virtual wallet
 * vocabulary (escrow-protected tuition wallet, top up / withdraw). */
function WalletCard() {
  return (
    <div className="home-chip home-chip--lg w-[264px] rounded-2xl p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium [color:var(--home-ink-muted)]">
          Wallet Balance
        </p>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#131313] px-2.5 py-1 text-[9px] font-bold text-white">
          <ArrowUpRight size={10} aria-hidden="true" /> Escrow
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[22px] font-bold leading-none tracking-[-0.01em] [color:var(--home-ink)]">
          ₦ 22,850.00
        </p>
        <Eye size={14} className="shrink-0 text-ink-400" aria-hidden="true" />
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-[10px] font-semibold [color:var(--home-ink)]">
          <Plus size={10} aria-hidden="true" /> Top up
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-ink-50 px-2.5 py-1.5 text-[10px] font-semibold [color:var(--home-ink)]">
          <RefreshCw size={10} aria-hidden="true" /> Withdraw
        </span>
        <span aria-hidden="true" className="ms-auto text-[10px] tracking-[0.15em] text-ink-300">
          •••
        </span>
      </div>
    </div>
  );
}

/** Google rating badge — G mark + five stars + caption, as per reference. */
function RatingCard() {
  return (
    <div className="home-chip flex items-center gap-3 rounded-2xl px-4 py-3">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-7 shrink-0">
        <path
          fill="#FFC107"
          d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
        />
        <path
          fill="#FF3D00"
          d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
        />
      </svg>
      <div>
        <div className="flex items-center gap-0.5" aria-label="Rated 5 stars on Google">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={11} className="fill-[#F6A609] text-[#F6A609]" aria-hidden="true" />
          ))}
        </div>
        <p className="mt-1 text-[11px] font-bold [color:var(--home-ink)]">
          5 star Google rating
        </p>
      </div>
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate bg-[var(--color-background)]">
      {/* faint graph-paper grid, fading out toward the section edge */}
      <div
        aria-hidden="true"
        className="home-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_58%,transparent_98%)]"
      />

      <HomePillNav />

      {/* centred copy stack */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1040px] flex-col items-center px-4 pt-32 text-center sm:px-6 sm:pt-36">
        <HeroBadge />
        <HeroHeadline />
        <HeroSub />
        <HeroCtas />
        <HeroTrust />
      </div>

      {/* stage — pastel circle + learner, cropped by the section edge.
          Stage height = 80% of the circle diameter at every breakpoint so
          the circle bottom (and the learner's lower body) crop, as in the
          reference. The stage clips; the cards sit in an unclipped overlay
          box matched to the circle so the wallet card can hang off the rim. */}
      <div className="relative z-[5] mx-auto mt-10 h-[min(73.6vw,368px)] w-full max-w-[1500px] overflow-hidden sm:h-[min(52.8vw,496px)] lg:mt-12 lg:h-[min(48vw,720px)]">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 aspect-square w-[min(92vw,460px)] -translate-x-1/2 overflow-hidden rounded-full sm:w-[min(66vw,620px)] lg:w-[min(60vw,900px)]"
        >
          <div className="absolute inset-0 rounded-full bg-[var(--home-circle)]" />

          {/* cut-out learner — head just under the crown, body cropped */}
          <div className="absolute inset-x-0 top-[6%] h-[99%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/hero-student.png"
              alt=""
              className="hero-anim hero-anim--1 mx-auto block h-full w-auto max-w-none object-contain object-top mix-blend-multiply motion-reduce:animate-none"
            />
          </div>
        </div>

        {/* floating cards — centred on the circle rim (md+ only) */}
        <div className="absolute left-1/2 top-0 aspect-square w-[min(92vw,460px)] -translate-x-1/2 sm:w-[min(66vw,620px)] lg:w-[min(60vw,900px)]">
          <div className="absolute left-[19%] top-[20%] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="animate-hero-float motion-reduce:animate-none">
              <PoweredCard />
            </div>
          </div>
          <div className="absolute left-[99%] top-[41%] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="animate-hero-float-slow motion-reduce:animate-none">
              <WalletCard />
            </div>
          </div>
          <div className="absolute left-[14%] top-[56%] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
            <div className="animate-hero-float [animation-delay:0.6s] motion-reduce:animate-none">
              <RatingCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
