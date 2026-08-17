import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, GraduationCap, BarChart3, MessageSquare, Download } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { DownloadHero } from "@/components/layout/DownloadHero";
import { GooglePlayBadge } from "@/components/ui/StoreBadges";

export const metadata: Metadata = buildMetadata({
  title: "Download the NUVORA Android App",
  description:
    "Download the NUVORA Android app (APK) for learning on the go — tutors, live cohorts, quizzes and AI chat in your pocket.",
  path: "/download",
});

// Replace this with the URL where you host the APK (Vercel public dir,
// Cloudflare R2, or Google Drive). Build it with:
//   cd mobile && npx eas build -p android --profile preview
const APK_URL = "/nuvora-app.apk";

export default function DownloadPage() {
  return (
    <main className="relative min-h-screen bg-[#FFF7E4] pb-16 dark:bg-[#0B1220]">
      <DownloadHero />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center shadow-sm dark:border-ink-700 dark:bg-[#141C2E]">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-gold-light text-brand-green">
            <Smartphone size={30} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-brand-navy dark:text-white">NUVORA for Android</h2>
          <p className="mt-1 text-sm text-ink-500">
            Version 0.1.0 · ~40 MB · Android 8.0+ · Free
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href={APK_URL}
              download
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-8 py-3.5 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-brand-gold-hover"
            >
              <Download size={16} /> Download APK
            </a>
          </div>
          <div className="mt-5 flex justify-center">
            <GooglePlayBadge href={APK_URL} />
          </div>
          <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-ink-400">
            On your phone: allow <span className="font-semibold">“Install unknown apps”</span> for your
            browser or file manager when prompted (Settings → Security → Unknown sources). iOS users can
            use the web app for now — the App Store version is in review prep.
          </p>
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
          Prefer the browser?{" "}
          <Link href="/" className="font-semibold text-brand-gold-dark hover:underline">
            Open NUVORA on the web
          </Link>{" "}
          — or{" "}
          <Link href="/contact" className="font-semibold text-brand-gold-dark hover:underline">
            contact support
          </Link>{" "}
          if the download fails.
        </p>
      </div>
    </main>
  );
}
