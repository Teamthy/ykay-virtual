import type { Metadata } from "next";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, CreditCard, BookOpen, GraduationCap, ShieldCheck, Users, Award } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "How It Works - Choose, Enrol, Learn, Track | YK-Virtual",
  description: "How YK-Virtual works for parents, students and tutors: discover programmes, enrol securely with escrow, attend lessons and track progress.",
  path: "/how-it-works",
});

const PARENT_STEPS = [
  { n: "01", icon: Search, title: "Choose your track", body: "Browse programmes, cohorts and vetted tutors — filter by curriculum, level and exam.", points: ["JSS to SS3", "British & Nigerian", "Exam prep"] },
  { n: "02", icon: CreditCard, title: "Enrol securely", body: "Secure your spot with escrow-protected payment. Wallet, receipts and parent approvals in one place.", points: ["Escrow hold", "Instant receipt", "Parent approval"] },
  { n: "03", icon: BookOpen, title: "Learn live", body: "Join live lessons, access recordings, submit assignments and chat with tutors. Everything in the LMS.", points: ["Live + recorded", "Assignments", "Chat & support"] },
  { n: "04", icon: GraduationCap, title: "Track progress", body: "Parents get attendance, scores and tutor reports. Students earn certificates and keep momentum.", points: ["Attendance", "Reports", "Certificates"] },
];

const TUTOR_STEPS = [
  { n: "01", icon: Users, title: "Apply", body: "Create your profile and choose your subjects on the Become a Tutor flow.", points: ["Profile", "Subjects", "Rates"] },
  { n: "02", icon: ShieldCheck, title: "Get vetted", body: "Identity check, document review, interview and a competency assessment.", points: ["ID check", "Interview", "Competency"] },
  { n: "03", icon: BookOpen, title: "Teach", body: "Accept learners, run lessons, mark attendance and write lesson notes.", points: ["Live lessons", "Attendance", "Notes"] },
  { n: "04", icon: Award, title: "Get paid", body: "Escrow releases after delivery confirmation; weekly payouts to your account.", points: ["Escrow release", "Weekly payout", "Bank transfer"] },
];

export default function HowItWorksPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "How It Works", item: "https://virtual.ykaycollege.com/how-it-works" },
  ]);

  return (
    <main className="w-full overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <PageHero
        eyebrow="Simple by design"
        title="How YK-Virtual works"
        subtitle="Four steps for families, four steps for tutors — with escrow protection and full visibility at every stage."
        crumbs={[{ name: "Home", href: "/" }, { name: "How It Works" }]}
        align="center"
        ctas={[
          { label: "Browse programmes", href: "/programmes", primary: true },
          { label: "Request private tuition", href: "/private-tuition" },
        ]}
      />

      {/* For families - dark */}
      <section className="relative w-full bg-[#0F2A1A] py-12 lg:py-20">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '28px 28px' }} />
        <div className="relative mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{"<<"} For families {">>"}</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.9] text-white uppercase max-w-[16ch]">Four steps for families</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PARENT_STEPS.map((s) => (
                <div key={s.title} className="rounded-[20px] bg-white p-6">
                  <div className="flex justify-between items-start">
                    <div className="grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-white"><s.icon size={16} /></div>
                    <span className="text-[11px] font-bold text-[#0F2A1A]/30">{s.n}</span>
                  </div>
                  <h3 className="mt-5 font-display text-[16px] leading-none uppercase text-[#0F2A1A]">{s.title}</h3>
                  <p className="mt-2 text-[12px] leading-[1.5] text-[#0F2A1A]/60">{s.body}</p>
                  <ul className="mt-4 space-y-1">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F2A1A]/70"><CheckCircle2 size={11} /> {p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/programmes" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A]">Browse programmes <span className="grid size-6 place-items-center rounded-full bg-[#0F2A1A] text-white"><ArrowRight size={12} /></span></Link>
              <Link href="/private-tuition" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">Request private tuition</Link>
            </div>
          </div>
        </div>
      </section>

      {/* For tutors - light */}
      <section className="relative w-full bg-[#F9F6ED] py-12 lg:py-20">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="mx-auto max-w-[1200px]">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/50">{"<<"} For tutors {">>"}</p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.9] text-[#0F2A1A] uppercase max-w-[14ch]">Four steps for tutors</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {TUTOR_STEPS.map((s) => (
                <div key={s.title} className="rounded-[20px] bg-white border border-black/10 p-6 shadow-[0_4px_24px_rgba(15,42,26,0.06)]">
                  <div className="flex justify-between items-start">
                    <div className="grid size-10 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><s.icon size={16} /></div>
                    <span className="text-[11px] font-bold text-[#0F2A1A]/30">{s.n}</span>
                  </div>
                  <h3 className="mt-5 font-display text-[16px] leading-none uppercase text-[#0F2A1A]">{s.title}</h3>
                  <p className="mt-2 text-[12px] leading-[1.5] text-[#0F2A1A]/60">{s.body}</p>
                  <ul className="mt-4 space-y-1">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0F2A1A]/70"><CheckCircle2 size={11} /> {p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link href="/become-tutor" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-black">Apply to teach <span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={12} /></span></Link>
            </div>
          </div>
        </div>
      </section>

      {/* escrow band */}
      <section className="w-full bg-white py-12">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mx-auto max-w-[1200px] rounded-[20px] bg-[#0F2A1A] p-8 text-white flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#D6FF57]">Escrow protected</p>
              <h3 className="mt-2 font-display text-[22px] leading-none uppercase">Fees stay in escrow until lessons are delivered</h3>
              <p className="mt-2 text-[13px] text-white/60 max-w-[50ch]">Payments are held until teaching happens, then released to your tutor. Support mediates if anything goes wrong.</p>
            </div>
            <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A]">How payments work <ArrowRight size={14} /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
