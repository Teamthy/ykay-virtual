import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import {
  GraduationCap,
  MonitorSmartphone,
  ShieldCheck,
  Award,
  ArrowRight,
  School,
  Wifi,
  MapPin,
} from "lucide-react";

const COLLEGE_URL =
  process.env.NEXT_PUBLIC_COLLEGE_URL || "https://ykaycollege.com";

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

/**
 * The gateway between the two Ykay schools — the mirror of the college site's
 * /virtual page.
 *
 * A full-viewport split screen: YK-Virtual on one side (you are here), the
 * college on the other. CSS-only hover expansion — hovering a side grows it
 * so choosing feels physical. On mobile the halves stack.
 */
export default function CollegePage() {
  return (
    <>
      {/* ── The split gateway ── */}
      <section className="flex min-h-[calc(100vh-5rem)] w-full flex-col md:flex-row">
        {/* Virtual half — you are already here */}
        <div className="group relative flex min-h-[42vh] flex-1 flex-col justify-between overflow-hidden bg-deep-green p-8 transition-[flex-grow] duration-500 md:p-12 md:hover:flex-[1.35]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
          />
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              <Wifi size={11} /> You are here
            </p>
            <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.86] tracking-[-0.015em] text-white">
              YK-VIRTUAL
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75">
              100% online — live classes, group cohorts, private 1-on-1 tuition and exam
              preparation, on any device from anywhere in Nigeria.
            </p>
          </div>
          <div className="relative mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/programmes"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-ink-900 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-primary-hover active:scale-[0.97]"
            >
              Explore programmes <ArrowRight size={14} />
            </a>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              virtual.ykaycollege.com
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="relative h-px w-full md:h-auto md:w-px">
          <div className="absolute inset-0 bg-ink-100 dark:bg-ink-800" />
          <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-100 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-ink-500 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300">
            or
          </span>
        </div>

        {/* College half — the destination */}
        <div className="group relative flex min-h-[42vh] flex-1 flex-col justify-between overflow-hidden bg-white p-8 transition-[flex-grow] duration-500 md:p-12 md:hover:flex-[1.35] dark:bg-ink-900">
          <div className="relative">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-ink-200 bg-ink-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300">
              <MapPin size={11} /> Campus · Sango Ota
            </p>
            <h2 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.86] tracking-[-0.015em] text-ink-950 dark:text-white">
              YKAY
              <span className="block text-deep-green dark:text-primary">COLLEGE</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              The campus school — JSS1 to SS3 with science laboratories, sports, clubs
              and a full IT academy built into the timetable.
            </p>
          </div>
          <div className="relative mt-8 flex flex-wrap items-center gap-4">
            <a
              href={COLLEGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-deep-green px-7 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white shadow-lg transition-all duration-300 hover:scale-[1.03] hover:bg-deep-green-light active:scale-[0.97] dark:bg-primary dark:text-ink-900 dark:hover:bg-primary-hover"
            >
              Continue to Ykay College <ArrowRight size={14} />
            </a>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-400">
              {COLLEGE_URL.replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>
      </section>

      {/* ── Pillars ── */}
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
              <h2 className="mb-2 font-display text-lg text-ink-950">{p.title}</h2>
              <p className="text-sm leading-relaxed text-ink-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two schools · one family ── */}
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
                  <h3 className="font-display text-xl text-ink-950">{d.label}</h3>
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
              Continue to {COLLEGE_URL.replace(/^https?:\/\//, "")}
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
