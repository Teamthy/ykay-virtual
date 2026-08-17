import Link from "next/link";
import { Play, Apple, WifiOff, Bell, FileCheck2 } from "lucide-react";

// DownloadHero — on-brand download hero. Self-contained (no remote store
// buttons, no remote gradient, no invented social proof).

const APK_URL = "/nuvora-app.apk";

const PERKS = [
  { icon: WifiOff, text: "Learn offline" },
  { icon: Bell, text: "Instant notifications" },
  { icon: FileCheck2, text: "Progress reports" },
];

export function DownloadHero() {
  return (
    <section className="w-full border-b border-ink-100 bg-surface py-14 md:py-20">
      <div className="container-x grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">NUVORA mobile</p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-[0.02em] text-brand-navy md:text-6xl">
            Download NUVORA on the go
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-ink-600">
            Learn anywhere — tutors, live cohorts, quizzes, progress reports and the AI assistant in one app.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={APK_URL}
              download
              aria-label="Download the Android APK"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <Play size={16} fill="currentColor" />
              Get it on Google Play
            </Link>
            <button
              type="button"
              aria-label="Apple App Store (coming soon)"
              title="App Store listing coming soon — use the Android APK for now."
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-ink-300 px-5 py-3 text-sm font-bold text-ink-500"
            >
              <Apple size={16} />
              App Store — soon
            </button>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-6">
            {PERKS.map((p) => (
              <li key={p.text} className="flex items-center gap-2 text-sm font-semibold text-ink-700">
                <p.icon size={16} className="text-brand-green" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <img
            src="/hero/african-student.png"
            alt="African student learning on the NUVORA app"
            className="w-full rounded-3xl object-cover shadow-card ring-1 ring-ink-100"
          />
        </div>
      </div>
    </section>
  );
}
