import Link from "next/link";
import { ArrowRight, Smartphone, Bell, FileCheck2, WifiOff } from "lucide-react";

export function DownloadAppCTA() {
  return (
    <section id="download" className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          {/* top CTA row like reference */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="font-display text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase max-w-[12ch]">
              Ready to start your learning journey?
            </h2>

            <Link href="/download" className="group flex items-center justify-between gap-4 rounded-[16px] bg-[#D6FF57] p-4 lg:w-[340px] transition hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <div className="grid size-8 place-items-center rounded-full bg-white">
                  <Smartphone size={14} className="text-[#0F2A1A]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">Free · Install in seconds</p>
                  <p className="text-[12px] font-extrabold uppercase leading-[1.1] text-[#0F2A1A]">BOOK YOUR 15-MINS FREE CONSULTATION</p>
                </div>
              </div>
              <span className="grid size-8 place-items-center rounded-full bg-[#0F2A1A] text-white transition group-hover:bg-black">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>

          {/* app showcase white card like reference footer but for app */}
          <div className="mt-10 rounded-[20px] bg-white p-6 lg:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.15)]">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]">
                  <Smartphone size={12} /> YK-Virtual on the go
                </div>
                <h3 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-[0.9] text-[#0F2A1A] uppercase">
                  Your classroom, in your pocket.
                </h3>
                <p className="mt-3 max-w-[50ch] text-[14px] leading-[1.6] text-[#0F2A1A]/70">
                  Live lessons, CBT practice, assignments and progress — installed from this website in seconds. Works offline, updates itself. No app store required.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/download#android" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-5 py-3 text-[13px] font-bold text-white hover:bg-black">
                    Install on Android <ArrowRight size={14} />
                  </Link>
                  <Link href="/download#iphone" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-black/5">
                    Install on iPhone
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {[
                    { icon: WifiOff, text: "Learn offline" },
                    { icon: Bell, text: "Instant notifications" },
                    { icon: FileCheck2, text: "Progress reports" },
                  ].map((p) => (
                    <span key={p.text} className="inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A]/5 px-3 py-1.5 text-[11px] font-bold text-[#0F2A1A]">
                      <p.icon size={12} /> {p.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-[28px] bg-[#0F2A1A] p-3 shadow-xl lg:ml-auto">
                <div className="rounded-[20px] bg-white p-4">
                  <div className="aspect-[9/14] overflow-hidden rounded-[16px] bg-[#F9F6ED]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/hero/student-learning.jpg" alt="Student learning on a laptop" className="h-full w-full object-cover object-[58%_30%]" />
                  </div>
                  <div className="mt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">YK-Virtual</p>
                    <p className="font-display text-[16px] leading-tight text-[#0F2A1A]">Full app. Same login.</p>
                    <p className="mt-1 text-[11px] leading-[1.4] text-[#0F2A1A]/65">Add to Home Screen and open straight into My Learning, CBT and messages.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
