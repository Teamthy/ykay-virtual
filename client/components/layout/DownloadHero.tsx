import { WifiOff, Bell, FileCheck2 } from "lucide-react";
import { GooglePlayBadge } from "@/components/ui/StoreBadges";

// DownloadHero - on-brand download hero. Self-contained (no remote store
// buttons, no invented social proof). Android uses the official Google Play
// badge (APK download today); iOS shows the official App Store badge disabled
// until the listing exists.

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
            Learn anywhere - tutors, live cohorts, quizzes, progress reports and the AI assistant in one app.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <GooglePlayBadge href="/nuvora-app.apk" />
            <GooglePlayBadge disabled />
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
