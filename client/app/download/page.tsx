import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { DownloadHero } from "@/components/layout/DownloadHero";

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
          <p className="text-6xl">📱</p>
          <h2 className="mt-4 text-xl font-extrabold text-brand-navy dark:text-white">NUVORA for Android</h2>
          <p className="mt-1 text-sm text-ink-500">
            Version 0.1.0 · ~40 MB · Android 8.0+ · Free
          </p>
          <a
            href={APK_URL}
            download
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-brand-gold px-8 text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-brand-gold-hover"
          >
            ⬇ Download APK
          </a>
          <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-ink-400">
            On your phone: allow <span className="font-semibold">“Install unknown apps”</span> for your
            browser or file manager when prompted (Settings → Security → Unknown sources). iOS users can
            use the web app for now — the App Store version is in review prep.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "🎓", title: "Cohorts & tutors", desc: "Browse programmes, join live classes, book 1:1 tuition." },
            { icon: "📊", title: "LMS on the go", desc: "Lessons, quizzes, assignments, attendance and reports." },
            { icon: "💬", title: "AI chat 24/7", desc: "Ask Nuvora anything — or hand over to a human agent." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-100 bg-white p-5 text-center dark:border-ink-700 dark:bg-[#141C2E]">
              <p className="text-2xl">{f.icon}</p>
              <p className="mt-2 text-sm font-bold text-brand-navy dark:text-white">{f.title}</p>
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
