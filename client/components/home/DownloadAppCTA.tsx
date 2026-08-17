import Link from "next/link";
import { Play, Apple, WifiOff, Bell, FileCheck2 } from "lucide-react";

// Download-app section — self-contained: no remote store-button SVGs, no
// remote gradient, no invented social-proof counts. Local image + brand
// palette + real product perks.

const PERKS = [
  { icon: WifiOff, text: "Learn offline" },
  { icon: Bell, text: "Instant notifications" },
  { icon: FileCheck2, text: "Progress reports" },
];

export function DownloadAppCTA() {
  return (
    <section className="bg-surface">
      <div className="container-x grid items-center gap-10 py-16 md:py-20 lg:grid-cols-2">
        {/* Copy + store buttons */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green">
            NUVORA on the go
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight tracking-[0.02em] text-brand-navy md:text-5xl">
            Your classroom, in your pocket.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-ink-600">
            Attend live lessons, take quizzes, submit assignments and track progress from your
            phone — even offline.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <Play size={16} fill="currentColor" />
              Get it on Google Play
            </Link>
            <button
              type="button"
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

        {/* Local image */}
        <div className="mx-auto w-full max-w-md">
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
