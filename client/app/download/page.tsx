import type { Metadata } from "next";
import Link from "next/link";
import {
  Smartphone,
  GraduationCap,
  BarChart3,
  MessageSquare,
  Download,
  RefreshCw,
  ShieldCheck,
  Check,
  Share,
  Plus,
} from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { DownloadHero } from "@/components/layout/DownloadHero";

export const metadata: Metadata = buildMetadata({
  title: "Install the YK-Virtual app — Android & iPhone",
  description:
    "Install the YK-Virtual app straight from your browser on Android or iPhone — the full mobile experience: live classes, quizzes, progress reports and AI chat. No app store needed.",
  path: "/download",
});

// Android APK fallback (Option B). Host the built APK anywhere (Vercel public
// dir, Cloudflare R2, GitHub Releases) and point this env var at it:
//   cd mobile && npx eas build -p android --profile preview
const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "/yk-virtual-app.apk";

const APK_STEPS = [
  "Tap the Download APK button below.",
  "When prompted, allow your browser or file manager to install unknown apps.",
  "Open the downloaded file and tap Install.",
  "Launch YK-Virtual and log in — done.",
];

/**
 * Install page — PWA-first.
 *
 * The installable web app is the primary experience now: a full replica of
 * the mobile build that installs from the browser on BOTH platforms in
 * seconds. The Android APK stays as Option B for parents who prefer a file.
 */
export default function DownloadPage() {
  return (
    <main className="relative min-h-screen bg-[#FFF7E4] pb-16 dark:bg-[#0B1220]">
      <DownloadHero />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* ── Option A: install instantly (PWA) ── */}
        <div className="rounded-2xl border-2 border-[#4CCB31] bg-white p-8 shadow-sm dark:border-[#4CCB31]/60 dark:bg-[#141C2E]">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#DFFFF2] text-[#013920]">
            <Smartphone size={30} />
          </span>
          <h2 className="mt-4 text-center text-xl font-extrabold text-brand-navy dark:text-white">
            Install instantly — Android &amp; iPhone
          </h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm leading-6 text-ink-500">
            The full YK-Virtual app, straight from this website. Installs in
            seconds, takes almost no space, updates itself — no app store, no
            &quot;unknown source&quot; warnings.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {/* Android */}
            <div className="rounded-2xl border border-ink-100 bg-[#FAFAF7] p-5 dark:border-ink-700 dark:bg-[#0E1526]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#013920] dark:text-[#70F250]">
                On Android
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-6 text-ink-600 dark:text-ink-300">
                <li>Open this site in Chrome.</li>
                <li>
                  Tap <b className="text-brand-navy dark:text-white">Install</b> on the
                  banner, or menu{" "}
                  <b className="text-brand-navy dark:text-white">⋮ → Install app</b>.
                </li>
                <li>Confirm — YK-Virtual appears on your home screen.</li>
              </ol>
            </div>
            {/* iPhone */}
            <div className="rounded-2xl border border-ink-100 bg-[#FAFAF7] p-5 dark:border-ink-700 dark:bg-[#0E1526]">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#013920] dark:text-[#70F250]">
                On iPhone
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm leading-6 text-ink-600 dark:text-ink-300">
                <li>Open this site in Safari.</li>
                <li>
                  Tap the{" "}
                  <b className="inline text-brand-navy dark:text-white">
                    Share <Share size={12} className="inline" />
                  </b>{" "}
                  button.
                </li>
                <li>
                  Scroll down, tap{" "}
                  <b className="inline text-brand-navy dark:text-white">
                    Add to Home Screen <Plus size={12} className="inline" />
                  </b>
                  , then Add.
                </li>
              </ol>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
            <Check size={13} className="text-deep" />
            Works offline for what you have already opened · full-screen, no browser bar
          </p>
        </div>

        {/* ── Option B: Android APK ── */}
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm dark:border-ink-700 dark:bg-[#141C2E]">
          <h2 className="text-lg font-extrabold text-brand-navy dark:text-white">
            Prefer a file? Android app (APK)
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Version 0.1.0 · ~40 MB · Android 8.0+ · Free
          </p>
          <div className="mt-5 flex justify-center">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-brand-gold-hover"
            >
              <Download size={16} /> Download APK
            </a>
          </div>
          <details className="mt-4 text-left">
            <summary className="mx-auto w-fit cursor-pointer text-xs font-semibold text-ink-500 hover:text-ink-700">
              How to install the APK
            </summary>
            <ol className="mt-3 space-y-2">
              {APK_STEPS.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-ink-600 dark:text-ink-300"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </details>
          <div className="mt-5 flex items-start justify-center gap-3 rounded-2xl border border-ink-100 bg-[#FAFAF7] p-4 text-left dark:border-ink-700 dark:bg-[#0E1526]">
            <RefreshCw size={16} className="mt-0.5 shrink-0 text-deep" />
            <p className="text-xs leading-5 text-ink-500">
              The app checks for updates on launch and applies them in the
              background — you never have to re-download it.
            </p>
          </div>
        </div>

        {/* What you get */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: GraduationCap,
              title: "Cohorts & tutors",
              desc: "Browse programmes, join live classes, book 1:1 tuition.",
            },
            {
              icon: BarChart3,
              title: "LMS on the go",
              desc: "Lessons, quizzes, assignments, attendance and reports.",
            },
            {
              icon: MessageSquare,
              title: "AI chat 24/7",
              desc: "Ask YK-Virtual anything — or hand over to a human agent.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-100 bg-white p-5 text-center dark:border-ink-700 dark:bg-[#141C2E]"
            >
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-gold-light text-[#013920]">
                <f.icon size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-brand-navy dark:text-white">
                {f.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-500">
          <Check size={14} className="mr-1 inline text-deep" />
          Both install options are free. Need help?{" "}
          <Link
            href="/contact"
            className="font-semibold text-brand-gold-dark hover:underline"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
