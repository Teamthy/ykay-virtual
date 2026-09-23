import Link from "next/link";
import { ArrowRight, GraduationCap, Wallet, Calendar, ShieldCheck } from "lucide-react";

export function BecomeTutorCTA() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F9F6ED]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-[24px] bg-[#0F2A1A] p-6 lg:p-10 overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
            <div className="absolute -right-[15%] -top-[20%] h-[60%] w-[40%] rounded-full bg-[#D6FF57]/20 blur-[80px]" />

            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">
                  <GraduationCap size={12} /> Now onboarding vetted tutors
                </div>
                <h2 className="mt-4 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase">
                  Teach what you love. <span className="text-[#D6FF57]">Get paid to do it.</span>
                </h2>
                <p className="mt-4 max-w-[50ch] text-[14px] leading-[1.6] text-white/70">
                  Join YK-Virtual&apos;s community of vetted tutors. Set your own rates and schedule, teach online or in person, and get paid for delivered lessons — while we handle bookings, payments and students for you.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-3 max-w-[420px]">
                  {[
                    { icon: Wallet, label: "Set your rates" },
                    { icon: Calendar, label: "Your schedule" },
                    { icon: ShieldCheck, label: "Escrow paid" },
                  ].map((f) => (
                    <div key={f.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center">
                      <f.icon size={14} className="mx-auto text-[#D6FF57]" />
                      <p className="mt-1 text-[11px] font-bold text-white">{f.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/become-tutor" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#c8f030]">
                    Apply to teach <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white"><ArrowRight size={12} /></span>
                  </Link>
                  <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
                    How it works
                  </Link>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[20px] bg-white p-5 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-[#0F2A1A] text-white grid place-items-center font-bold">A</div>
                    <div>
                      <p className="text-[13px] font-bold text-[#0F2A1A]">Adaeze O.</p>
                      <p className="text-[11px] text-[#0F2A1A]/60">Maths & Physics · 4.9 ★ · 120 students</p>
                    </div>
                    <span className="ml-auto rounded-full bg-[#D6FF57] px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A]">TOP TUTOR</span>
                  </div>
                  <div className="mt-4 rounded-[12px] bg-[#F9F6ED] p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/50">This month</p>
                    <p className="mt-1 text-[20px] font-extrabold text-[#0F2A1A]">₦ 285,000</p>
                    <p className="text-[11px] text-[#0F2A1A]/60">12 lessons delivered · Escrow released</p>
                    <div className="mt-2 h-1.5 rounded-full bg-black/10">
                      <div className="h-full w-[85%] rounded-full bg-[#0F2A1A]" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <span className="rounded-full bg-[#0F2A1A]/5 px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A]">Online</span>
                    <span className="rounded-full bg-[#0F2A1A]/5 px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A]">In-person</span>
                    <span className="rounded-full bg-[#D6FF57] px-2.5 py-1 text-[10px] font-bold text-[#0F2A1A]">Verified</span>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 rounded-[14px] bg-[#D6FF57] px-4 py-3 shadow-lg hidden lg:block">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/60">Avg. rating</p>
                  <p className="text-[14px] font-extrabold text-[#0F2A1A]">4.9/5 from parents ★★★★★</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
