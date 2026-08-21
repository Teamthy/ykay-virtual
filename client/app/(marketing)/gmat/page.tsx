import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { GmatLeadForm } from "@/features/programmes/components/GmatLeadForm";
import { Target, Briefcase, MonitorPlay, Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "GMAT Prep - Diagnostic, drills and mocks | NUVORA",
  description:
    "GMAT prep with a vetted tutor: diagnostic, section drills, timed mocks and weekly notes. We do not publish an average score or pass rate.",
  path: "/gmat",
});

export default function GmatPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "GMAT Prep", item: "https://nuvora.com/gmat" },
  ]);
  const course = courseJsonLd({
    name: "NUVORA GMAT Preparation",
    description: "GMAT prep with vetted tutors - diagnostic, structured study plan, mock tests and section drills.",
    provider: "NUVORA",
    url: "https://nuvora.com/gmat",
  });
  const faq = faqJsonLd([
    { question: "How long does GMAT prep take?", answer: "Most students study 8-12 weeks with 2-3 sessions per week, depending on your diagnostic score and target." },
    { question: "Are lessons online or in-person?", answer: "Both. Choose in-person lessons or online via Zoom or Google Meet - whichever fits your schedule." },
  ]);

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      {/* Preline hero: announcement + gradient title + buttons */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute inset-0 before:absolute before:inset-x-0 before:top-0 before:h-full before:bg-[radial-gradient(ellipse_at_top,rgba(244,180,0,0.10),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-14 md:px-10 md:pt-20">
          {/* Announcement banner */}
          <div className="flex justify-center">
            <a
              href="#lead"
              className="inline-flex items-center gap-x-2 rounded-full border border-ink-200 bg-white p-1 ps-3 text-sm text-ink-800 shadow-sm transition hover:border-brand-gold"
            >
              GMAT prep with a vetted tutor
              <span className="inline-flex items-center gap-x-2 rounded-full bg-brand-gold-light px-2.5 py-1.5 font-semibold text-brand-gold-dark">
                Diagnostic first
              </span>
            </a>
          </div>

          {/* Title */}
          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h1 className="font-display text-4xl tracking-[0.02em] text-ink-900 md:text-5xl lg:text-6xl">
              Prepare for GMAT{" "}
              <span className="text-brand-gold-dark">
                from your diagnostic
              </span>
            </h1>
          </div>

          <div className="mx-auto mt-5 max-w-3xl text-center">
            <p className="text-lg text-ink-600">
              Work a plan from your diagnostic - Quant, Verbal, IR and AWA. We do not promise a
              sitting, school or score.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#lead"
              className="inline-flex items-center gap-x-3 rounded-md bg-primary-dark py-3 px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-primary-hover"
            >
              Get a GMAT tutor
              <ArrowRight size={16} />
            </a>
            <a
              href="#stats"
              className="inline-flex items-center gap-x-2 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
            >
              How prep works
            </a>
          </div>

          {/* Meta row */}
          <p className="mt-6 text-center text-sm text-ink-500">Quant, Verbal, IR and AWA - plan from your diagnostic, not a published average.</p>
        </div>
      </section>

      {/* Stats + quote */}
      <section id="stats" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
          <div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { v: "Plan", l: "From your diagnostic" },
                { v: "Mocks", l: "Timed and marked" },
                { v: "Reports", l: "Weekly notes" },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-ink-100 bg-surface-muted p-5 text-center">
                  <p className="font-display text-2xl text-brand-navy">{s.v}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-500">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm italic leading-relaxed text-ink-600">
              &ldquo;I had 530 in the diagnostic test with Quant being my lowest; my goal was at least
              700 to get into INSEAD MBA. Getting a GMAT tutor was the best decision I made. I was
              challenged, encouraged and thankfully, got the executive MBA admission.&rdquo;
            </p>
            <p className="mt-3 text-sm font-bold text-ink-800">- Past NUVORA GMAT student</p>
          </div>

          <div id="lead" className="scroll-mt-24">
            <GmatLeadForm />
          </div>
        </div>
      </section>

      <StepsToTutor
        title="Get a tutor in 3 simple steps"
        steps={[
          { n: "1", title: "Place a tutor request", desc: "Fill a quick request form and tell us your goal, your schedule and the sections of GMAT you need help with." },
          { n: "2", title: "Meet your perfect tutor", desc: "You will receive options of expert GMAT tutors near you and you can select your preferred tutor." },
          { n: "3", title: "Study and pass GMAT!", desc: "Begin lessons with your tutor immediately and learn what it takes to pass your GMAT exam with a high score." },
        ]}
      />

      {/* Benefits */}
      <section className="bg-surface-muted py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <h2 className="font-display text-2xl tracking-[0.02em] text-brand-navy md:text-3xl">
            Enjoy the benefits of passing GMAT
          </h2>
          <p className="mt-2 text-ink-600">No matter your reason for taking GMAT, we&apos;ll help you reach your goal.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div
              className="rounded-2xl border border-ink-100 bg-cover bg-center p-7 text-white"
              style={{
                backgroundImage:
                  "linear-gradient(165deg, rgba(6,15,38,0.88), rgba(1,57,32,0.7)), url(/hero/international.jpg)",
              }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-white">
                <Target size={20} />
              </div>
              <h3 className="mt-4 font-bold text-white">Clear study plan</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Start from a diagnostic, work to your target score and track weekly progress.
              </p>
              <Link href="/gmat" className="mt-4 inline-block text-sm font-bold text-brand-gold">
                Start a plan →
              </Link>
            </div>
            <div
              className="rounded-2xl border border-ink-100 bg-cover bg-center p-7 text-white"
              style={{
                backgroundImage:
                  "linear-gradient(165deg, rgba(6,15,38,0.88), rgba(1,57,32,0.7)), url(/hero/international.jpg)",
              }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-white">
                <Briefcase size={20} />
              </div>
              <h3 className="mt-4 font-bold text-white">Career applications</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Use GMAT prep as part of a job or MBA application - we do not promise a specific employer.
              </p>
              <Link href="/gmat" className="mt-4 inline-block text-sm font-bold text-brand-gold">
                Get a tutor →
              </Link>
            </div>
            <div
              className="rounded-2xl border border-ink-100 bg-cover bg-center p-7 text-white"
              style={{
                backgroundImage:
                  "linear-gradient(165deg, rgba(6,15,38,0.88), rgba(1,57,32,0.7)), url(/hero/test-prep.jpg)",
              }}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-white">
                <MonitorPlay size={20} />
              </div>
              <h3 className="mt-4 font-bold text-white">Study on your phone</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Same NUVORA login on mobile - live lessons and recordings in the browser. No second site.
              </p>
              <Link href="/online-classes" className="mt-4 inline-block text-sm font-bold text-brand-gold">
                Book online lessons →
              </Link>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
            <ul className="grid gap-3 sm:grid-cols-2 text-sm text-ink-600">
              {["Personalised study plan from your diagnostic", "Section drills - Quant, Verbal, IR, AWA", "Official mock exams every 2 weeks", "Weekly progress reports to your inbox"].map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check size={15} className="mt-0.5 shrink-0 text-brand-green" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <GuaranteeBand />
    </main>
  );
}
