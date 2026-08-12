import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { GmatLeadForm } from "@/features/programmes/components/GmatLeadForm";
import { Globe2, Briefcase, MonitorPlay, Check, ArrowRight } from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = buildMetadata({
  title: "GMAT Prep — Pass Your GMAT in One Sitting | NUVORA",
  description:
    "Achieve your target GMAT score for MBA or job tests with help from a top-rated GMAT tutor. Average score 720, 95% success rate, 350+ students coached.",
  path: "/gmat",
});

export default function GmatPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "GMAT Prep", item: "https://nuvora.com/gmat" },
  ]);
  const course = courseJsonLd({
    name: "NUVORA GMAT Preparation",
    description: "GMAT prep with top-rated tutors — diagnostic, structured study plan, mock tests and section drills.",
    provider: "NUVORA",
    url: "https://nuvora.com/gmat",
  });
  const faq = faqJsonLd([
    { question: "How long does GMAT prep take?", answer: "Most students study 8–12 weeks with 2–3 sessions per week, depending on your diagnostic score and target." },
    { question: "Are lessons online or in-person?", answer: "Both. Choose in-person lessons or online via Zoom or Google Meet — whichever fits your schedule." },
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
              GMAT season is here — 95% success rate
              <span className="inline-flex items-center gap-x-2 rounded-full bg-brand-gold-light px-2.5 py-1.5 font-semibold text-brand-gold-dark">
                Score 720+
              </span>
            </a>
          </div>

          {/* Title */}
          <div className="mx-auto mt-6 max-w-2xl text-center">
            <h1 className="font-display text-4xl tracking-[0.02em] text-ink-900 md:text-5xl lg:text-6xl">
              Pass your GMAT exam{" "}
              <span className="bg-clip-text bg-gradient-to-tl from-brand-gold-dark to-brand-gold text-transparent">
                in one sitting
              </span>
            </h1>
          </div>

          <div className="mx-auto mt-5 max-w-3xl text-center">
            <p className="text-lg text-ink-600">
              Achieve your target score for MBA or job tests with help from a top-rated GMAT tutor.
              Give us your details and we will bring success to you!
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#lead"
              className="inline-flex items-center gap-x-3 rounded-md bg-gradient-to-tl from-brand-gold-dark to-brand-gold py-3 px-4 text-sm font-medium text-white transition-all hover:from-brand-gold hover:to-brand-gold-hover"
            >
              Get a GMAT tutor
              <ArrowRight size={16} />
            </a>
            <a
              href="#stats"
              className="inline-flex items-center gap-x-2 rounded-md border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-800 shadow-sm transition-colors hover:bg-ink-50"
            >
              See our results
            </a>
          </div>

          {/* Meta row */}
          <div className="mt-6 flex flex-col items-center justify-center gap-1.5 sm:flex-row sm:gap-3">
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">Average score:</span>
              <span className="text-sm font-bold text-ink-900">720</span>
            </div>
            <svg className="hidden size-5 text-ink-300 sm:block" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 13L10 3" stroke="currentColor" strokeLinecap="round" />
            </svg>
            <div className="flex flex-wrap gap-1 sm:gap-3">
              <span className="text-sm text-ink-600">GMAT students coached:</span>
              <span className="text-sm font-bold text-ink-900">350+</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats + quote */}
      <section id="stats" className="scroll-mt-24 bg-white py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 grid lg:grid-cols-[1fr_1fr] gap-12 items-center">
          <div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { v: "720", l: "Average score" },
                { v: "95%", l: "Success rate" },
                { v: "350+", l: "GMAT students" },
              ].map((s) => (
                <div key={s.l} className="text-center rounded-2xl border border-ink-100 bg-surface-muted p-6">
                  <p className="font-display text-4xl tracking-[0.02em] text-brand-navy">{s.v}</p>
                  <p className="mt-2 text-xs font-semibold text-ink-500">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm italic leading-relaxed text-ink-600">
              &ldquo;I had 530 in the diagnostic test with Quant being my lowest; my goal was at least
              700 to get into INSEAD MBA. Getting a GMAT tutor was the best decision I made. I was
              challenged, encouraged and thankfully, got the executive MBA admission.&rdquo;
            </p>
            <p className="mt-3 text-sm font-bold text-ink-800">— Past NUVORA GMAT student</p>
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
            <div className="rounded-2xl border border-ink-100 bg-white p-7">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                <Globe2 size={20} />
              </div>
              <h3 className="mt-4 font-bold text-ink-800">Study Abroad</h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                Don&apos;t leave anything to chance as you prepare for graduate schools like INSEAD, LBS,
                Kellogg&apos;s, Harvard and Cambridge.
              </p>
              <Link href="/study-abroad" className="mt-4 inline-block text-sm font-bold text-brand-blue hover:text-brand-navy">
                Get a tutor →
              </Link>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-7">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                <Briefcase size={20} />
              </div>
              <h3 className="mt-4 font-bold text-ink-800">Get your dream job</h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                Work with an expert to ensure you pass the test and get the job.
              </p>
              <Link href="/gmat" className="mt-4 inline-block text-sm font-bold text-brand-blue hover:text-brand-navy">
                Get a tutor →
              </Link>
            </div>
            <div className="rounded-2xl border border-ink-100 bg-white p-7">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-blue-light text-brand-blue">
                <MonitorPlay size={20} />
              </div>
              <h3 className="mt-4 font-bold text-ink-800">Prefer to study online?</h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                Book online lessons and study via Zoom or Google Meets from the comfort of your home.
              </p>
              <Link href="/online-classes" className="mt-4 inline-block text-sm font-bold text-brand-blue hover:text-brand-navy">
                Book online lessons →
              </Link>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
            <ul className="grid gap-3 sm:grid-cols-2 text-sm text-ink-600">
              {["Personalised study plan from your diagnostic", "Section drills — Quant, Verbal, IR, AWA", "Official mock exams every 2 weeks", "Weekly progress reports to your inbox"].map((f) => (
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
