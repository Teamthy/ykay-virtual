import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle2,
  Clock,
  Code,
  Cpu,
  FileText,
  GraduationCap,
  Keyboard,
  MonitorSmartphone,
  Shield,
  Users,
} from "lucide-react";
import {
  buildMetadata,
  courseJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  DIGITAL_COURSES,
  getDigitalCourse,
  type DigitalCourse,
} from "@/features/digital-skills/courses";
import { LeadCapture } from "@/features/leads/LeadCapture";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

const ICONS: Record<DigitalCourse["icon"], typeof Cpu> = {
  cpu: Cpu,
  keyboard: Keyboard,
  code: Code,
  brain: Brain,
  shield: Shield,
  file: FileText,
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const course = getDigitalCourse(params.slug);
  if (!course) {
    return buildMetadata({
      title: "Course not found",
      description: "Course not found",
      path: `/digital-skills/${params.slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${course.title} — Digital Skills | YK-Virtual`,
    description: course.tagline,
    path: `/digital-skills/${course.slug}`,
  });
}

export default async function DigitalCoursePage(props: Props) {
  const params = await props.params;
  const course = getDigitalCourse(params.slug);
  if (!course) notFound();

  const Icon = ICONS[course.icon];
  const related = DIGITAL_COURSES.filter((c) => c.slug !== course.slug).slice(
    0,
    3,
  );

  const courseLd = courseJsonLd({
    name: `${course.title} — YK-Virtual Digital Skills`,
    description: course.description,
    provider: "YK-Virtual",
    url: `https://virtual.ykaycollege.com/digital-skills/${course.slug}`,
  });
  const faqLd = faqJsonLd(
    course.faq.map((f) => ({ question: f.q, answer: f.a })),
  );
  const crumbs = breadcrumbJsonLd([
    { name: "Home", item: "https://virtual.ykaycollege.com/" },
    {
      name: "Digital Skills",
      item: "https://virtual.ykaycollege.com/digital-skills",
    },
    {
      name: course.title,
      item: `https://virtual.ykaycollege.com/digital-skills/${course.slug}`,
    },
  ]);

  return (
    <main className="container-x py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Digital Skills", href: "/digital-skills" },
          { name: course.title },
        ]}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mt-6 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="p-8 md:p-10">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
              style={{ background: course.color }}
            >
              <Icon size={13} /> {course.level}
            </span>
            <h1 className="mt-4 font-display text-4xl tracking-[0.02em] text-brand-navy">
              {course.title}
            </h1>
            <p className="mt-3 text-lg font-medium text-ink-700">
              {course.tagline}
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">
              {course.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {course.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-brand-blue-light px-3 py-1 text-xs font-semibold text-brand-blue"
                >
                  {s}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/cohorts" className="btn-primary text-sm">
                Find a cohort
              </a>
              <Link href="/private-tuition" className="btn-secondary text-sm">
                Book private tuition
              </Link>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-full border border-ink-200 px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-ink-300"
              >
                Ask a question
              </a>
            </div>
          </div>

          {/* Fact card */}
          <aside className="border-t border-ink-100 bg-surface p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              At a glance
            </p>
            <ul className="mt-4 space-y-4 text-sm text-ink-700">
              <li className="flex items-center gap-3">
                <Clock size={16} className="text-brand-gold" />{" "}
                <span>
                  <strong className="block">Duration</strong>
                  {course.duration}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Users size={16} className="text-brand-gold" />{" "}
                <span>
                  <strong className="block">For</strong>
                  {course.ages}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <MonitorSmartphone size={16} className="text-brand-gold" />{" "}
                <span>
                  <strong className="block">Mode</strong>
                  {course.mode}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <GraduationCap size={16} className="text-brand-gold" />{" "}
                <span>
                  <strong className="block">Certificate</strong>On completion
                </span>
              </li>
            </ul>
            <p className="mt-6 rounded-xl bg-white p-4 text-sm font-bold text-brand-navy shadow-soft">
              {course.price}
            </p>
          </aside>
        </div>
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* ── Left: curriculum + outcomes ────────────────────────────────── */}
        <div className="space-y-10">
          <section>
            <h2 className="font-display text-2xl text-brand-navy">
              What you&apos;ll learn
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              By the end of this course you will be able to:
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {course.outcomes.map((o) => (
                <li
                  key={o}
                  className="flex items-start gap-3 rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-700 shadow-soft"
                >
                  <CheckCircle2
                    size={18}
                    className="mt-0.5 shrink-0 text-brand-gold-dark"
                  />
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl text-brand-navy">
              Curriculum
            </h2>
            <div className="mt-5 space-y-3">
              {course.modules.map((m, i) => (
                <details
                  key={m.title}
                  className="group rounded-2xl border border-ink-100 bg-white shadow-soft"
                  open={i === 0}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 font-bold text-ink-800 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gold-light text-xs font-bold text-brand-gold-dark">
                        {i + 1}
                      </span>
                      {m.title}
                    </span>
                    <span className="text-ink-400 transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <ul className="space-y-2 border-t border-ink-50 px-5 py-4">
                    {m.topics.map((t) => (
                      <li
                        key={t}
                        className="flex items-center gap-2 text-sm text-ink-600"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: course.color }}
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl text-brand-navy">Questions</h2>
            <div className="mt-5 space-y-3">
              {course.faq.map((f) => (
                <details
                  key={f.q}
                  className="rounded-2xl border border-ink-100 bg-white shadow-soft"
                >
                  <summary className="cursor-pointer p-5 text-sm font-bold text-ink-800 marker:content-none [&::-webkit-details-marker]:hidden">
                    {f.q}
                  </summary>
                  <p className="border-t border-ink-50 px-5 py-4 text-sm leading-relaxed text-ink-600">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* ── Right rail: enrolment card + related ───────────────────────── */}
        <aside className="space-y-6">
          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card lg:sticky lg:top-24">
            <h3 className="font-display text-xl text-brand-navy">
              Start learning
            </h3>
            <p className="mt-1 text-sm text-ink-600">
              Join a live cohort or study one-on-one with a vetted tutor.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-ink-600">
              <li className="flex items-center gap-2">
                <BadgeCheck size={14} className="text-brand-gold-dark" /> Vetted
                tutors, small classes
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck size={14} className="text-brand-gold-dark" />{" "}
                Escrow-protected payment
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck size={14} className="text-brand-gold-dark" />{" "}
                Certificate on completion
              </li>
            </ul>
            <a href="/cohorts" className="btn-primary mt-5 w-full text-sm">
              Browse cohorts
            </a>
            <Link
              href="/private-tuition"
              className="btn-secondary mt-2 w-full text-sm"
            >
              Book a private tutor
            </Link>
          </div>

          <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-soft">
            <h3 className="font-display text-lg text-brand-navy">
              Related courses
            </h3>
            <ul className="mt-4 divide-y divide-ink-50">
              {related.map((r) => {
                const RIcon = ICONS[r.icon];
                return (
                  <li key={r.slug}>
                    <Link
                      href={`/digital-skills/${r.slug}`}
                      className="group flex items-center gap-3 py-3"
                    >
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                        style={{ background: r.color }}
                      >
                        <RIcon size={16} />
                      </span>
                      <span className="flex-1 text-sm font-semibold text-ink-700 group-hover:text-brand-navy">
                        {r.title}
                      </span>
                      <ArrowRight
                        size={14}
                        className="text-ink-300 group-hover:text-brand-gold-dark"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <Link
            href="/digital-skills"
            className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy hover:underline"
          >
            <ArrowLeft size={15} /> All digital-skills courses
          </Link>
        </aside>
      </div>
      {/* Conversion follow-up */}
      <div className="container-x pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-brand-gold bg-brand-gold-light p-6">
          <div>
            <p className="font-display text-xl font-bold text-brand-navy">
              Not sure this track is for you?
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-600">
              Tell us your goals and we&apos;ll call you back with an honest
              recommendation — the right course, or none at all.
            </p>
          </div>
          <LeadCapture source={`/digital-skills/${course.slug}`} />
        </div>
      </div>
    </main>
  );
}
