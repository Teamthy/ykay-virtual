import type { Metadata } from "next";
import Image from "next/image";
import { buildMetadata } from "@/lib/seo";
import { Reveal } from "@/components/ui/reveal";
import { AnimatedText } from "@/components/ui/animated-text";
import { ArrowRight, ArrowUpRight, Globe, MapPin } from "lucide-react";

const COLLEGE_URL =
  process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

export const metadata: Metadata = buildMetadata({
  title: "Ykay College — Our Campus School | YK-Virtual",
  description:
    "Ykay College & Leadership Academy is the campus school of the Ykay family in Sango Ota, Ogun State — premium day secondary education, WAEC/NECO/JAMB excellence and a digital skills academy.",
  path: "/college",
});

/**
 * The gateway between the two Ykay schools — editorial, image-led, the mirror
 * of the college site's /virtual page: a big editorial header, then two
 * full-bleed image cards (index marks 01 / 02, photo scale-on-hover, deep
 * scrim so type always reads in both light and dark mode).
 */
export default function CollegePage() {
  return (
    <>
      {/* ── Editorial header ── */}
      <section className="w-full border-b border-ink-100 px-6 pb-10 pt-28 md:px-10 md:pb-14 dark:border-ink-800">
        <div className="mx-auto w-full max-w-[1400px]">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink-100 bg-surface px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500 dark:border-ink-800">
            <Globe size={12} className="text-deep dark:text-primary" /> The Ykay family
          </p>
          <h1 className="font-display text-[clamp(2.75rem,9vw,8rem)] leading-[0.85] tracking-[-0.015em] text-ink-950 dark:text-white">
            <AnimatedText heavy stagger={0.03} text="TWO SCHOOLS." delay={0.0} className="block" />
            <span className="block text-deep dark:text-primary">
              <AnimatedText heavy stagger={0.03} text="ONE FAMILY." delay={0.2} />
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-500 md:text-lg">
            Learn online with YK-Virtual, or on campus with Ykay College — the same
            teachers, the same standards, whichever fits your child.
          </p>
        </div>
      </section>

      {/* ── The two cards ── */}
      <section className="w-full px-6 py-10 md:px-10 md:py-14">
        <div className="mx-auto grid w-full max-w-[1400px] gap-6 md:grid-cols-2">
          {/* 01 — the online school (you are here) */}
          <Reveal>
            <div className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl border border-ink-100 shadow-lg dark:border-ink-800">
              <Image
                src="/hero/cohorts.jpg"
                alt="Students in a live YK-Virtual online class"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-green/95 via-deep-green/55 to-deep-green/10" />

              <div className="relative flex h-full flex-col justify-between p-7 md:p-9">
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    <Globe size={11} className="text-primary" /> You are here
                  </span>
                  <span className="font-display text-xl tracking-widest text-white/50">
                    (01)
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.88] tracking-[-0.01em] text-white">
                    YK-VIRTUAL
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
                    100% online — live classes, group cohorts, private 1-on-1 tuition
                    and exam preparation, on any device from anywhere in Nigeria.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a
                      href="/programmes"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
                    >
                      Explore programmes <ArrowRight size={13} />
                    </a>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      virtual.ykaycollege.com
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* 02 — the campus school (destination) */}
          <Reveal delay={80}>
            <div className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl border border-ink-100 shadow-lg dark:border-ink-800">
              <Image
                src="/hero/african-student.jpg"
                alt="A Ykay College student on campus"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002A18]/95 via-[#002A18]/55 to-[#002A18]/10" />

              <div className="relative flex h-full flex-col justify-between p-7 md:p-9">
                <div className="flex items-start justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                    <MapPin size={11} className="text-primary" /> Campus · Sango Ota
                  </span>
                  <span className="font-display text-xl tracking-widest text-white/50">
                    (02)
                  </span>
                </div>

                <div>
                  <h2 className="font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-[0.88] tracking-[-0.01em] text-white">
                    YKAY
                    <span className="block text-primary">COLLEGE</span>
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
                    The campus school — JSS1 to SS3 with science laboratories, sports,
                    clubs and a full IT academy built into the timetable.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-4">
                    <a
                      href={COLLEGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
                    >
                      Continue to Ykay College <ArrowUpRight size={13} />
                    </a>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                      {COLLEGE_URL.replace(/^https?:\/\//, "")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Why families choose the college ── */}
      <section className="w-full border-t border-ink-100 bg-surface-muted py-16 dark:border-ink-800 md:py-24">
        <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 md:grid-cols-2 md:px-10">
          <div>
            <AnimatedText
              as="h2"
              className="font-display text-3xl text-ink-950 dark:text-white md:text-4xl"
              text="Why families choose Ykay College"
            />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-500 md:text-base">
              Ykay College &amp; Leadership Academy is where the Ykay family began — a
              physical secondary school in Sango Ota, Ogun State, combining academic
              excellence with leadership and digital skills.
            </p>
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-deep-green px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition-all duration-300 hover:scale-[1.03] hover:bg-deep-green-light active:scale-[0.97] dark:bg-primary dark:text-ink-900 dark:hover:bg-primary-hover"
            >
              Visit {COLLEGE_URL.replace(/^https?:\/\//, "")} <ArrowUpRight size={14} />
            </a>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              ["A real campus in Sango Ota", "Modern labs, classrooms and co-curricular life."],
              ["WAEC · NECO · JAMB record", "Structured revision, mocks, verified results."],
              ["Digital skills academy", "Python, AI basics, cybersecurity, Microsoft Office."],
              ["Verified records", "Report cards and certificates checkable online."],
            ].map(([title, desc], i) => (
              <li
                key={title}
                className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-soft"
              >
                <span className="font-display text-sm tracking-widest text-deep dark:text-primary">
                  ({String(i + 1).padStart(2, "0")})
                </span>
                <h3 className="mt-2 text-sm font-bold text-ink-950">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
