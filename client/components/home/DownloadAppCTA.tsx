import Link from "next/link";
import { Smartphone, Apple, WifiOff, Bell, FileCheck2 } from "lucide-react";

import { AnimatedText } from "@/components/ui/animated-text";

// Download-app section — PWA-first.
//
// The installable web app IS the mobile build now: the same screens, offline
// support and full-screen experience, installable straight from the browser on
// BOTH Android and iPhone — no store, no APK warnings. The Android APK stays
// available on /download as the fallback for parents who prefer a file.

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
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-primary-light/10 blur-3xl"
      />
      <div className="container-x relative grid items-center gap-10 py-16 md:py-20 lg:grid-cols-2">
        {/* Copy + install buttons */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            YK-Virtual on the go
          </p>
          <AnimatedText
            as="h2"
            className="mt-4 font-display text-4xl leading-tight tracking-[0.02em] text-white md:text-5xl"
            text="Your classroom, in your pocket."
          />
          <p className="mt-5 max-w-md leading-relaxed text-white/80">
            The full mobile app — live lessons, quizzes, assignments and progress —
            installed straight from this website in seconds. Works offline, updates
            itself, and no app store is needed.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-ink-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover"
            >
              <Smartphone size={16} />
              Install — Android
            </Link>
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Apple size={16} />
              Install — iPhone
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

        {/* Phone mock — brand tile framing the install steps */}
        <div className="justify-self-center">
          <div className="w-fit rounded-[2rem] border border-white/15 bg-black/25 p-6 backdrop-blur-sm sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Install in 3 steps
            </p>
            <ol className="mt-4 space-y-3">
              {[
                ["Android", "Open the site in Chrome, tap Install."],
                ["iPhone", "Open in Safari, tap Share, then Add to Home Screen."],
                ["Open", "Launch from your home screen — full screen, no browser bar."],
              ].map(([k, v], i) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary font-display text-xs text-ink-900">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-white/85">
                    <b className="text-white">{k}:</b> {v}
                  </p>
                </li>
              ))}
            </ol>
            <Link
              href="/download"
              className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary hover:text-primary-hover"
            >
              Full install guide →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
