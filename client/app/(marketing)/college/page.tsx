import type { Metadata } from "next";
import { PageHero } from "@/components/layout/PageHero";
import { buildMetadata } from "@/lib/seo";
import {
  GraduationCap,
  MonitorSmartphone,
  ShieldCheck,
  Award,
  ArrowRight,
  School,
  Wifi,
} from "lucide-react";

const COLLEGE_URL =
  process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.edu.ng";

export const metadata: Metadata = buildMetadata({
  title: "Ykay College — Our Campus School | YK-Virtual",
  description:
    "Ykay College & Leadership Academy is the campus school of the Ykay family in Sango Ota, Ogun State — premium day secondary education, WAEC/NECO/JAMB excellence and a digital skills academy.",
  path: "/college",
});

const PILLARS = [
  {
    icon: School,
    title: "A real campus in Sango Ota",
    body: "A premium day secondary school in Ogun State with modern labs, classrooms and co-curricular life — raising future leaders through excellence in education.",
  },
  {
    icon: Award,
    title: "WAEC · NECO · JAMB track record",
    body: "A strong external-examination culture with structured revision, mock examinations and verified results students can prove to any institution.",
  },
  {
    icon: MonitorSmartphone,
    title: "Digital skills academy",
    body: "Learners graduate with real IT skills — Python, AI basics, cybersecurity and Microsoft Office — alongside the standard Nigerian curriculum.",
  },
  {
    icon: ShieldCheck,
    title: "Verified records",
    body: "Report cards and certificates issued by the college can be verified online — transparency built into school operations.",
  },
];

const DIFFERENCE = [
  {
    label: "YK-Virtual",
    tag: "This site — 100% online",
    points: [
      "Live online classes and group cohorts",
      "Private 1-on-1 tuition, anywhere",
      "UTME, WAEC, IELTS, GMAT/GRE prep",
      "Learn from home, on any device",
    ],
    online: true,
  },
  {
    label: "Ykay College",
    tag: "Campus school — Sango Ota",
    points: [
      "Full day secondary school experience",
      "Science labs, sports and clubs",
      "IT academy built into the timetable",
      "Physical campus in Ogun State",
    ],
    online: false,
  },
];

export default function CollegePage() {
  return (
    <>
      <PageHero
        eyebrow="THE YKAY FAMILY"
        title="Ykay College & Leadership Academy"
        subtitle="The campus arm of the Ykay family. If YK-Virtual is our virtual classroom, Ykay College is where it all began — a physical secondary school in Sango Ota, Ogun State, combining academic excellence with leadership and digital skills."
      >
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={COLLEGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB31] px-7 py-3.5 text-sm font-bold text-[#013920] transition-colors hover:bg-[#5FE63F]"
          >
            Visit the college website
            <ArrowRight size={16} />
          </a>
          <span className="text-xs text-ink-500">
            Opens {COLLEGE_URL.replace(/^https?:\/\//, "")} in a new tab
          </span>
        </div>
      </PageHero>

      <section className="mx-auto w-full max-w-[1400px] px-6 py-14 md:px-10 md:py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft"
            >
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#4CCB31] text-[#013920]">
                <p.icon size={22} />
              </div>
              <h2 className="mb-2 font-display text-lg text-ink-950">
                {p.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-ink-100 bg-surface-muted">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-14 md:px-10 md:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-500">
              Two schools · one family
            </p>
            <h2 className="font-display text-3xl text-ink-950 md:text-4xl">
              Learn online with YK-Virtual, or on campus with Ykay College
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {DIFFERENCE.map((d) => (
              <div
                key={d.label}
                className={
                  d.online
                    ? "rounded-2xl border-2 border-[#4CCB31] bg-surface p-7"
                    : "rounded-2xl border border-ink-100 bg-surface p-7"
                }
              >
                <div className="mb-1 flex items-center gap-2">
                  {d.online ? (
                    <Wifi size={16} className="text-ink-600" />
                  ) : (
                    <GraduationCap size={16} className="text-ink-600" />
                  )}
                  <h3 className="font-display text-xl text-ink-950">
                    {d.label}
                  </h3>
                </div>
                <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-500">
                  {d.tag}
                </p>
                <ul className="space-y-2.5">
                  {d.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-ink-700"
                    >
                      <span
                        className={
                          d.online
                            ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-[#4CCB31]"
                            : "mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-400"
                        }
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB31] px-7 py-3.5 text-sm font-bold text-[#013920] transition-colors hover:bg-[#5FE63F]"
            >
              Continue to ykaycollege.edu.ng
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
