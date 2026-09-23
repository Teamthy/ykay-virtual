import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Dices, ShieldCheck } from "lucide-react";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = buildMetadata({
  title: "CBT Practice - Timed Papers from the Published Bank | YK-Virtual",
  description:
    "Sit a timed computer-based practice paper drawn from the published question bank. Answers stay hidden until you submit, then you review the score and explanations.",
  path: "/cbt",
});

const STEPS = [
  {
    icon: Dices,
    title: "A fresh paper each sitting",
    body: "You choose the subject, length and difficulty. The paper is drawn at random from what is published — nothing here is a leaked live exam.",
  },
  {
    icon: ShieldCheck,
    title: "Marked on the server",
    body: "Correct answers stay hidden until you submit. The score is the mark for that sitting, not a prediction of JAMB, WAEC or any other board.",
  },
  {
    icon: BookOpenCheck,
    title: "Review every item",
    body: "After submit you see the key and why it is right, so the next revision session has somewhere specific to start.",
  },
];

export default function CbtPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    { name: "CBT", item: "https://virtual.ykaycollege.com/cbt" },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <PageHero
        cover="/home/card-cbt.jpg"
        eyebrow="Computer-based practice"
        title="Sit a paper. See the mark."
        subtitle="Timed practice from the published bank — JSS through WAEC, NECO and JAMB-style items. The question count on the practice page is the live total, not a marketing figure."
        crumbs={[{ name: "Home", href: "/" }, { name: "CBT" }]}
        ctas={[
          { label: "Open the practice bank", href: "/lms/practice", primary: true },
          { label: "Exam preparation", href: "/exam-prep" },
        ]}
      />

      <section className="w-full bg-white py-14 lg:py-20">
        <div className="container-x">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/55">What a sitting is</p>
          <h2 className="mt-3 max-w-[16ch] font-display text-[clamp(2rem,4vw,3.4rem)] uppercase leading-[0.95] text-[#0F2A1A]">
            Practice, not a forecast
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <article key={s.title} className="rounded-[20px] border border-black/10 bg-[#F9F6ED] p-6">
                <span className="grid size-11 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]">
                  <s.icon size={18} />
                </span>
                <h3 className="mt-5 font-display text-[22px] uppercase leading-none text-[#0F2A1A]">{s.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[#0F2A1A]/70">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-[#0F2A1A] py-14 text-white lg:py-16">
        <div className="container-x grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D6FF57]">Before you start</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,3.5vw,3rem)] uppercase leading-[0.95]">
              Sign in if you want the attempt saved.
            </h2>
            <p className="mt-4 max-w-[52ch] text-[14px] leading-relaxed text-white/75">
              You can open the bank and sit a paper from the practice page. Saving attempts to your account needs a sign-in. This is not a JAMB or WAEC registration, and it does not reserve a seat in a cohort.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/lms/practice" className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-6 py-3 text-[13px] font-bold text-[#0F2A1A] hover:bg-[#C8F030]">
              Start a paper <ArrowRight size={14} />
            </Link>
            <Link href="/login?next=/lms/practice" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[13px] font-bold text-white hover:bg-white/10">
              Sign in first
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
