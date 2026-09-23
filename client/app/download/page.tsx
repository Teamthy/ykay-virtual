import type { Metadata } from "next";
import Link from "next/link";
import { Smartphone, GraduationCap, BarChart3, MessageSquare, Check, Share, Plus, ArrowRight, WifiOff, Bell, FileCheck2 } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "Install the YK-Virtual app — Android & iPhone",
  description: "Install the YK-Virtual app straight from your browser on Android or iPhone — the full mobile experience: live classes, quizzes, progress reports and AI chat. No app store needed.",
  path: "/download",
});

export default function DownloadPage() {
  return (
    <main className="w-full overflow-hidden bg-[#F9F6ED]">
      <PageHero eyebrow="YK-Virtual mobile" title="Download YK-Virtual on the go" subtitle="Learn anywhere — tutors, live cohorts, quizzes, progress reports and the AI assistant in one app. Install free in seconds." crumbs={[{ name: "Home", href: "/" }, { name: "Download" }]} ctas={[{ label: "Install the app — free", href: "#pwa-install", primary: true }, { label: "How it works", href: "/how-it-works" }]} />

      {/* install */}
      <section className="w-full bg-[#F9F6ED] py-12 lg:py-20">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-[1100px]">
            <div id="pwa-install" className="scroll-mt-24 rounded-[20px] bg-white p-8 shadow-[0_8px_40px_rgba(15,42,26,0.08)] border border-black/10">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#0F2A1A] text-white">
                <Smartphone size={24} />
              </div>
              <h2 className="mt-5 text-center font-display text-[22px] uppercase leading-none text-[#0F2A1A]">Install instantly — Android and iPhone</h2>
              <p className="mx-auto mt-3 max-w-[50ch] text-center text-[13px] leading-relaxed text-[#0F2A1A]/60">The full YK-Virtual app, straight from this website. Installs in seconds, takes almost no space, updates itself — no app store, no “unknown source” warnings.</p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div id="android" className="scroll-mt-24 rounded-[16px] bg-[#F9F6ED] p-5 border border-black/5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">On Android</p>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-relaxed text-[#0F2A1A]/70">
                    <li>Open this site in Chrome.</li>
                    <li>Tap <b className="text-[#0F2A1A]">Install</b> on the banner, or menu <b>⋮ → Install app</b>.</li>
                    <li>Confirm — YK-Virtual appears on your home screen.</li>
                  </ol>
                </div>
                <div id="iphone" className="scroll-mt-24 rounded-[16px] bg-[#F9F6ED] p-5 border border-black/5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">On iPhone</p>
                  <ol className="mt-3 list-decimal space-y-2 pl-4 text-[13px] leading-relaxed text-[#0F2A1A]/70">
                    <li>Open this site in Safari.</li>
                    <li>Tap the <b>Share <Share size={11} className="inline" /></b> button.</li>
                    <li>Scroll down, tap <b>Add to Home Screen <Plus size={11} className="inline" /></b>, then Add.</li>
                  </ol>
                </div>
              </div>

              <p className="mt-6 flex items-center justify-center gap-2 text-center text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/50"><Check size={12} /> Works offline · full-screen, no browser bar</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: GraduationCap, title: "Cohorts & tutors", desc: "Browse programmes, join live classes, book 1:1 tuition." },
                { icon: BarChart3, title: "LMS on the go", desc: "Lessons, quizzes, assignments, attendance and reports." },
                { icon: MessageSquare, title: "AI chat 24/7", desc: "Ask YK-Virtual anything — or hand over to a human agent." },
              ].map((f) => (
                <div key={f.title} className="rounded-[16px] bg-white p-5 border border-black/10 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><f.icon size={18} /></span>
                  <p className="mt-3 text-[13px] font-bold text-[#0F2A1A]">{f.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#0F2A1A]/60">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[16px] bg-[#0F2A1A] p-6 flex flex-wrap items-center justify-between gap-4 text-white">
              <div className="flex gap-3">
                {[
                  { icon: WifiOff, text: "Learn offline" },
                  { icon: Bell, text: "Instant notifications" },
                  { icon: FileCheck2, text: "Progress reports" },
                ].map((p) => (
                  <span key={p.text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold"><p.icon size={12} /> {p.text}</span>
                ))}
              </div>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-5 py-2.5 text-[12px] font-bold text-[#0F2A1A]">Contact support <ArrowRight size={12} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
