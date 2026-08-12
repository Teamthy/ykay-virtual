import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd, faqJsonLd } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { StepsToTutor } from "@/components/home/StepsToTutor";
import { GuaranteeBand } from "@/components/home/GuaranteeBand";
import { GmatLeadForm } from "@/features/programmes/components/GmatLeadForm";
import { Globe2, Briefcase, MonitorPlay, Check } from "lucide-react";

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

      <PageHero
        eyebrow="GMAT Prep · Score 720+"
        title="Pass your GMAT exam in one sitting"
        subtitle="Achieve your target score for MBA or job tests with help from a top-rated GMAT tutor. Give us your details and we will bring success to you!"
        crumbs={[{ name: "Home", href: "/" }, { name: "GMAT Prep" }]}
        align="center"
      >
        <a href="#lead" className="btn-gold">Get a GMAT tutor</a>
      </PageHero>

      {/* Stats + quote */}
      <section className="bg-white py-16">
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
