import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, GraduationCap, BarChart3, MessageSquare, Download, RefreshCw, ShieldCheck, Check } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { DownloadHero } from "@/components/layout/DownloadHero";

export const metadata: Metadata = buildMetadata({
  title: "Download the NUVORA Android App",
  description:
    "Download the NUVORA Android app (APK) for learning on the go — tutors, live cohorts, quizzes and AI chat. Direct install, no store needed. Updates arrive automatically.",
  path: "/download",
});

// Host the built APK anywhere (Vercel public dir, Cloudflare R2, GitHub
// Releases, Google Drive) and point this env var at it. Build with:
//   cd mobile && npx eas build -p android --profile preview
// The built APK embeds EAS Update, so future app changes are delivered
// over-the-air (no re-download).
const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "/nuvora-app.apk";

const INSTALL_STEPS = [
  "Tap the Download APK button below.",
  "When prompted, allow your browser or file manager to install unknown apps.",
  "Open the downloaded file and tap Install.",
  "Launch NUVORA and log in — done.",
];

export default function DownloadPage() {
  return (
    <main className="relative min-h-screen bg-[#FFF7E4] pb-16 dark:bg-[#0B1220]">
      <DownloadHero />

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Primary download card */}
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm dark:border-ink-700 dark:bg-[#141C2E]">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-gold-light text-brand-green">
            <Smartphone size={30} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-brand-navy dark:text-white">NUVORA for Android</h2>
          <p className="mt-1 text-sm text-ink-500">Version 0.1.0 · ~40 MB · Android 8.0+ · Free</p>
          <div className="mt-6 flex justify-center">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-brand-gold-hover"
            >
              <Download size={16} /> Download APK
            </a>
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-ink-400">
            Direct install — no app store needed. On your phone, allow{" "}
            <span className="font-semibold">“Install unknown apps”</span> for your browser or file manager when prompted.
          </p>
        </div>

        {/* Automatic updates */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-700 dark:bg-[#141C2E]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
            <RefreshCw size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-navy dark:text-white">New features arrive automatically</p>
            <p className="mt-1 text-xs leading-5 text-ink-500">
              The app checks for updates on launch and applies them in the background — you never have to
              re-download it. Every time we ship a new feature or fix, you get it on your next open.
            </p>
          </div>
        </div>

        {/* Install guide */}
        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6 dark:border-ink-700 dark:bg-[#141C2E]">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-green" />
            <h3 className="font-display text-lg font-bold text-brand-navy dark:text-white">How to install</h3>
          </div>
          <ol className="mt-4 space-y-3">
            {INSTALL_STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink-600 dark:text-ink-300">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-navy">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: GraduationCap, title: "Cohorts & tutors", desc: "Browse programmes, join live classes, book 1:1 tuition." },
            { icon: BarChart3, title: "LMS on the go", desc: "Lessons, quizzes, assignments, attendance and reports." },
            { icon: MessageSquare, title: "AI chat 24/7", desc: "Ask Nuvora anything — or hand over to a human agent." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 bg-white p-5 text-center dark:border-ink-700 dark:bg-[#141C2E]">
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <f.icon size={20} />
              </span>
              <p className="mt-3 text-sm font-bold text-brand-navy dark:text-white">{f.title}</p>
              <p className="mt-1 text-xs leading-5 text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-ink-500">
          <Check size={14} className="mr-1 inline text-brand-green" />
          Android supported. iOS users can use the{" "}
          <Link href="/" className="font-semibold text-brand-gold-dark hover:underline">web app</Link>{" "}
          now — or{" "}
          <Link href="/contact" className="font-semibold text-brand-gold-dark hover:underline">contact support</Link>{" "}
          if the download fails.
        </p>
      </div>
    </main>
  );
}
