import Image from "next/image";
import Link from "next/link";
import { Apple, Play, WifiOff, Bell, FileCheck2 } from "lucide-react";

import { AnimatedText } from "@/components/ui/animated-text";

// Download-app section — premium split: copy + install actions on the left,
// a real phone mock on the right running a photo of the product. The PWA is
// the app: install straight from the site on Android and iPhone.

const PERKS = [
  { icon: WifiOff, text: "Learn offline" },
  { icon: Bell, text: "Instant notifications" },
  { icon: FileCheck2, text: "Progress reports" },
];

export function DownloadAppCTA() {
  return (
    <section className="relative overflow-hidden bg-deep-green">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-primary-light/10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 py-16 md:px-10 md:py-24 lg:grid-cols-2">
        {/* Copy + install */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            YK-Virtual on the go
          </p>
          <AnimatedText
            as="h2"
            className="mt-4 font-display text-4xl leading-[0.95] tracking-[0.02em] text-white md:text-6xl"
            text="Your classroom, in your pocket."
          />
          <p className="mt-5 max-w-md leading-relaxed text-white/80">
            Live lessons, quizzes, assignments and progress — installed straight
            from this website in seconds. Works offline, updates itself, and no
            app store is needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-ink-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <Play size={16} fill="currentColor" /> Install — Android
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Apple size={16} /> Install — iPhone
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {PERKS.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-2 text-xs font-semibold text-white/75"
              >
                <p.icon size={14} className="text-primary" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Phone mock */}
        <div className="justify-self-center">
          <div className="relative w-64 rounded-[2.8rem] border border-white/20 bg-black/40 p-3 shadow-2xl backdrop-blur-sm sm:w-72">
            {/* notch */}
            <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/70" />
            <div className="relative aspect-[9/19] overflow-hidden rounded-[2.2rem]">
              <Image
                src="/hero/african-student.jpg"
                alt="A student learning on the YK-Virtual app"
                fill
                sizes="288px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-green/95 via-deep-green/20 to-transparent" />
              {/* faux app chrome */}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  YK-Virtual
                </p>
                <p className="mt-1 font-display text-xl leading-tight text-white">
                  Lesson 12 · Algebra
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-2/3 rounded-full bg-primary" />
                </div>
                <p className="mt-1.5 text-[10px] font-semibold text-white/70">
                  Progress · 68% complete
                </p>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-5 max-w-xs text-center text-xs leading-relaxed text-white/60">
            The installed app runs full screen — no browser bar, feels native on
            both platforms.
          </p>
        </div>
      </div>
    </section>
  );
}
