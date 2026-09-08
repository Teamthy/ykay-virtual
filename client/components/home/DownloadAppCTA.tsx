import Image from "next/image";
import Link from "next/link";
import { Apple, Bell, FileCheck2, Play, Smartphone, WifiOff } from "lucide-react";

const PERKS = [
  { icon: WifiOff, text: "Learn offline" },
  { icon: Bell, text: "Instant notifications" },
  { icon: FileCheck2, text: "Progress reports" },
];

export function DownloadAppCTA() {
  return (
    <section className="relative w-full overflow-hidden bg-[#fff7e4]">
      <div className="grid w-full items-stretch lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 md:px-12 md:py-24 lg:px-16">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-deep-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-deep-green">
            <Smartphone size={12} /> YK-Virtual on the go
          </p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[0.9] tracking-[-0.02em] text-deep-green">
            Your classroom,
            <span className="block text-[#1a6b3c]">in your pocket.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-700">
            Live lessons, quizzes, assignments and progress — installed from
            this website in seconds. Works offline, updates itself. No app
            store required. The installed PWA is the full student app (LMS,
            practice, chat).
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/download#android"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-deep-green px-6 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:-translate-y-0.5 hover:bg-[#024d2c]"
            >
              <Play size={16} fill="currentColor" /> Install on Android
            </Link>
            <Link
              href="/download#iphone"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-deep-green/20 bg-white px-6 py-3.5 text-sm font-bold text-deep-green transition hover:-translate-y-0.5 hover:border-deep-green/40"
            >
              <Apple size={16} /> Install on iPhone
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {PERKS.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-2 text-xs font-semibold text-ink-600"
              >
                <p.icon size={14} className="text-deep-green" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-end justify-center bg-deep-green px-6 pb-0 pt-12 md:px-10">
          <div className="relative w-64 sm:w-72">
            <div className="relative rounded-[2.8rem] border border-white/20 bg-black/40 p-3 shadow-2xl">
              <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black/70" />
              <div className="relative aspect-[9/19] overflow-hidden rounded-[2.2rem]">
                <Image
                  src="/home/identity-learner.jpg"
                  alt="A student learning on the YK-Virtual app"
                  fill
                  sizes="288px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-deep-green/95 via-deep-green/20 to-transparent" />
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
            <p className="mx-auto mt-5 mb-10 max-w-xs text-center text-xs leading-relaxed text-white/70">
              Installed PWA runs full screen — no browser bar — and opens
              straight into My Learning.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
