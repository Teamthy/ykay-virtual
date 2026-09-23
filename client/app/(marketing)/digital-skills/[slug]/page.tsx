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
import { PageHero } from "@/components/layout/PageHero";
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
    <main className="bg-[#F9F6ED]">
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

      <PageHero
        cover="/hero/digital.jpg"
        eyebrow={`${course.level} / Digital skills`}
        title={course.title}
        subtitle={course.tagline}
        crumbs={[{ name: "Home", href: "/" }, { name: "Digital Skills", href: "/digital-skills" }, { name: course.title }]}
        ctas={[{ label: "Explore cohorts", href: "/cohorts", primary: true }, { label: "Request tuition", href: "/private-tuition" }]}
      />
      <div className="container-x py-12">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[20px] border border-black/10 bg-white shadow-card">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="p-8 md:p-10">
              <span
                className="inline-flex items-center gap-2 rounded-full bg-[#D6FF57] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]"
              >
                <Icon size={13} /> {course.level}
              </span>
              <h2 className="mt-4 font-display text-[clamp(1.8rem,3vw,2.8rem)] uppercase text-[#0F2A1A]">
                About this course
              </h2>
              <p className="mt-3 text-lg font-medium text-[#0F2A1A]/75">
                {course.tagline}
              </p>
              <p className="mt-4 max-w-2xl leading-relaxed text-[#0F2A1A]/70">
                {course.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {course.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#F9F6ED] px-3 py-1 text-xs font-semibold text-[#0F2A1A]"
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
                  className="inline-flex items-center justify-center rounded-full border border-black/10 px-5 py-2.5 text-sm font-semibold text-[#0F2A1A]/75 hover:border-black/10"
                >
                  Ask a question
                </a>
              </div>
            </div>

            {/* Fact card */}
            <aside className="border-t border-black/10 bg-[#F9F6ED] p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-bold uppercase tracking-wide text-[#0F2A1A]/65">
                At a glance
              </p>
              <ul className="mt-4 space-y-4 text-sm text-[#0F2A1A]/75">
                <li className="flex items-center gap-3">
                  <Clock size={16} className="text-[#0F2A1A]" />{" "}
                  <span>
                    <strong className="block">Duration</strong>
                    {course.duration}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Users size={16} className="text-[#0F2A1A]" />{" "}
                  <span>
                    <strong className="block">For</strong>
                    {course.ages}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <MonitorSmartphone size={16} className="text-[#0F2A1A]" />{" "}
                  <span>
                    <strong className="block">Mode</strong>
                    {course.mode}
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <GraduationCap size={16} className="text-[#0F2A1A]" />{" "}
                  <span>
                    <strong className="block">Certificate</strong>On completion
                  </span>
                </li>
              </ul>
              <p className="mt-6 rounded-xl bg-white p-4 text-sm font-bold text-[#0F2A1A] shadow-soft">
                {course.price}
              </p>
            </aside>
          </div>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* ── Left: curriculum + outcomes ────────────────────────────────── */}
          <div className="space-y-10">
            <section>
              <h2 className="font-display text-2xl text-[#0F2A1A]">
                What you&apos;ll learn
              </h2>
              <p className="mt-2 text-sm text-[#0F2A1A]/70">
                By the end of this course you will be able to:
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li
                    key={o}
                    className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm text-[#0F2A1A]/75 shadow-soft"
                  >
                    <CheckCircle2
                      size={18}
                      className="mt-0.5 shrink-0 text-[#0F2A1A]"
                    />
                    {o}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl text-[#0F2A1A]">
                Curriculum
              </h2>
              <div className="mt-5 space-y-3">
                {course.modules.map((m, i) => (
                  <details
                    key={m.title}
                    className="group rounded-2xl border border-black/10 bg-white shadow-soft"
                    open={i === 0}
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 font-bold text-[#0F2A1A]/85 marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F9F6ED] text-xs font-bold text-[#0F2A1A]">
                          {i + 1}
                        </span>
                        {m.title}
                      </span>
                      <span className="text-[#0F2A1A]/65 transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <ul className="space-y-2 border-t border-black/10 px-5 py-4">
                      {m.topics.map((t) => (
                        <li
                          key={t}
                          className="flex items-center gap-2 text-sm text-[#0F2A1A]/70"
                        >
                          <span
                            className="size-1.5 rounded-full bg-[#D6FF57]"
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
              <h2 className="font-display text-2xl text-[#0F2A1A]">Questions</h2>
              <div className="mt-5 space-y-3">
                {course.faq.map((f) => (
                  <details
                    key={f.q}
                    className="rounded-2xl border border-black/10 bg-white shadow-soft"
                  >
                    <summary className="cursor-pointer p-5 text-sm font-bold text-[#0F2A1A]/85 marker:content-none [&::-webkit-details-marker]:hidden">
                      {f.q}
                    </summary>
                    <p className="border-t border-black/10 px-5 py-4 text-sm leading-relaxed text-[#0F2A1A]/70">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right rail: enrolment card + related ───────────────────────── */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-card lg:sticky lg:top-24">
              <h3 className="font-display text-xl text-[#0F2A1A]">
                Start learning
              </h3>
              <p className="mt-1 text-sm text-[#0F2A1A]/70">
                Join a live cohort or study one-on-one with a vetted tutor.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-[#0F2A1A]/70">
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#0F2A1A]" /> Vetted
                  tutors, small classes
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#0F2A1A]" />{" "}
                  Escrow-protected payment
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck size={14} className="text-[#0F2A1A]" />{" "}
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

            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-soft">
              <h3 className="font-display text-lg text-[#0F2A1A]">
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
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]"
                        >
                          <RIcon size={16} />
                        </span>
                        <span className="flex-1 text-sm font-semibold text-[#0F2A1A]/75 group-hover:text-[#0F2A1A]">
                          {r.title}
                        </span>
                        <ArrowRight
                          size={14}
                          className="text-[#0F2A1A]/65 group-hover:text-[#0F2A1A]"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Link
              href="/digital-skills"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0F2A1A] hover:underline"
            >
              <ArrowLeft size={15} /> All digital-skills courses
            </Link>
          </aside>
        </div>
        {/* Conversion follow-up */}
        <div className="pb-12 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#D6FF57] bg-[#F9F6ED] p-6">
            <div>
              <p className="font-display text-xl font-bold text-[#0F2A1A]">
                Not sure this track is for you?
              </p>
              <p className="mt-1 max-w-md text-sm text-[#0F2A1A]/70">
                Tell us your goals and we&apos;ll call you back with an honest
                recommendation — the right course, or none at all.
              </p>
            </div>
            <LeadCapture source={`/digital-skills/${course.slug}`} />
          </div>
        </div>
      </div>
    </main>
  );
}
