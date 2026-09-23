import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CARDS = [
  {
    id: "1",
    title: "STUDY SKILLS",
    desc: "How to Build a Consistent Study Routine That Actually Works for JSS & SSS",
    img: "/home/ykay-students.png",
    href: "/study-skills",
    tag: "Study Tips",
  },
  {
    id: "2",
    title: "EXAM STRATEGY",
    desc: "Simple Revision Habits to Boost Energy, Focus and Exam Results",
    img: "/home/card-exam.jpg",
    href: "/exam-strategy",
    tag: "Exam Prep",
  },
  {
    id: "3",
    title: "PARENT GUIDE",
    desc: "Proven Strategies to Support Learning and Maintain Motivation at Home",
    img: "/home/card-tuition.jpg",
    href: "/parent-guide",
    tag: "For Parents",
  },
];

export async function PopularProgrammes() {
  return (
    <section className="relative w-full overflow-hidden bg-[#F9F6ED]">
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0F2A1A]/65">{"<<"} Learning & Insights {">>"}</p>
          <h2 className="mt-4 font-display text-[clamp(1.4rem,3vw,2.2rem)] leading-[1.05] tracking-[-0.02em] text-[#0F2A1A] uppercase">
            Learning tips and guidance to support your progress every step of the way
          </h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3 max-w-[1200px] mx-auto">
          {CARDS.map((card) => (
            <Link key={card.id} href={card.href} className="group overflow-hidden rounded-[20px] bg-white shadow-[0_4px_24px_rgba(15,42,26,0.06)] transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,42,26,0.12)]">
              <div className="relative aspect-[16/11] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.img} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
              </div>
              <div className="p-5">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0F2A1A]">{card.title}</p>
                <p className="mt-2 text-[13px] leading-[1.4] text-[#0F2A1A]/70 line-clamp-3">{card.desc}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65 group-hover:text-[#0F2A1A] transition">Read More</span>
                  <span className="grid size-7 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A] transition group-hover:bg-[#0F2A1A] group-hover:text-white">
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/programmes" className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white hover:bg-black">
            Browse all programmes <span className="grid size-6 place-items-center rounded-full bg-[#D6FF57] text-[#0F2A1A]"><ArrowRight size={12} /></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
