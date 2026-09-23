import Link from "next/link";
import { ArrowRight, Wallet, GraduationCap, Users, Lock, CheckCircle2 } from "lucide-react";

export function BecomeTutorCTA() {
  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="text-center max-w-[700px] mx-auto">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{"<<"} Become a tutor {">>"}</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[0.9] tracking-[-0.02em] text-white uppercase">
              Teach what you love. <span className="text-[#D6FF57]">Get paid to do it.</span>
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-white/60">Set your rates, choose your schedule, teach online or in-person. We handle bookings, payments and students.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {/* card 1 */}
            <div className="rounded-[20px] bg-white p-6">
              <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><GraduationCap size={16} /></div>
              <h3 className="mt-4 font-display text-[16px] uppercase text-[#0F2A1A]">You set the terms</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/65">Your rates, your hours, your subjects. Online, at home, or hybrid — you choose.</p>
              <ul className="mt-4 space-y-2">
                {["Set your own rates", "Choose online / in-person", "Pick subjects you love"].map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[11px] font-bold text-[#0F2A1A]/70"><span className="size-1.5 rounded-full bg-[#0F2A1A]" /> {s}</li>
                ))}
              </ul>
            </div>

            {/* card 2 lime — honest payout mechanics, no invented earnings */}
            <div className="rounded-[20px] bg-[#D6FF57] p-6">
              <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><Wallet size={16} /></div>
              <h3 className="mt-4 font-display text-[16px] uppercase text-[#0F2A1A]">Escrow & weekly payouts</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/70">How payouts work:</p>
              <div className="mt-4 space-y-3 rounded-[12px] bg-white p-4">
                {[
                  { icon: Lock, text: "Families pay upfront into escrow before lessons start." },
                  { icon: CheckCircle2, text: "Funds release to you only after the lesson is delivered." },
                  { icon: Wallet, text: "Releases are paid out weekly to your bank account." },
                ].map((s) => (
                  <p key={s.text} className="flex items-start gap-2 text-[11px] leading-snug font-semibold text-[#0F2A1A]">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"><s.icon size={11} /></span>
                    {s.text}
                  </p>
                ))}
              </div>
              <Link href="/become-tutor" className="mt-5 inline-flex w-full items-center justify-between rounded-full bg-[#0F2A1A] px-5 py-3 text-[13px] font-bold text-white"><span>Apply to teach</span><span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={14} /></span></Link>
            </div>

            {/* card 3 */}
            <div className="rounded-[20px] bg-white p-6">
              <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><Users size={16} /></div>
              <h3 className="mt-4 font-display text-[16px] uppercase text-[#0F2A1A]">We bring students</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#0F2A1A]/65">Families search, compare and book directly on YK-Virtual. Vetted tutors get priority placement and bookings.</p>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-1">
                  {["/tutors/chinasa.jpg", "/tutors/judith.jpg", "/tutors/olanike.jpg"].map((s) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={s} src={s} alt="" className="size-6 rounded-full border-2 border-white object-cover" />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-[#0F2A1A]">Vetted tutors onboarded</span>
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#0F2A1A]/5 px-3 py-1.5 text-[11px] font-bold text-[#0F2A1A]"><CheckCircle2 size={11} className="text-[#0F2A1A]/70" /> Escrow release after every delivery</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
