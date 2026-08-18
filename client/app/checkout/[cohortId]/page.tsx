import type { Metadata } from "next";
import { GraduationCap, BookOpen, LineChart, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { getCohortSSR } from "@/features/cohorts/api/get";
import { CheckoutClient } from "@/features/bookings/components/CheckoutClient";

type Props = { params: Promise<{ cohortId: string }> };

export const revalidate = 300;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  return buildMetadata({
    title: "Checkout - Enrol securely",
    description: "Pay securely. Funds are held in escrow until lessons are delivered.",
    path: `/checkout/${params.cohortId}`,
    noIndex: true, // checkout is an app surface, not an indexable page
  });
}

export default async function CheckoutPage(props: Props) {
  const params = await props.params;
  let cohort;
  try {
    cohort = await getCohortSSR(params.cohortId);
  } catch {
    notFound(); // hard 404, never a soft-404 (SEO rule)
  }

  if (!cohort || cohort.status !== "PUBLISHED") {
    notFound();
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", item: "https://nuvora.com/" },
    { name: "Programmes", item: "https://nuvora.com/programmes" },
    { name: cohort.title, item: `https://nuvora.com/checkout/${cohort.id}` },
  ]);

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <nav aria-label="Breadcrumb" className="text-xs text-ink-500 mb-4">
        <a href="/" className="hover:text-brand-blue">Home</a>
        <span className="mx-2">/</span>
        <a href="/programmes" className="hover:text-brand-blue">Programmes</a>
        <span className="mx-2">/</span>
        <span className="text-ink-700 font-medium">{cohort.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-navy">Enrol in {cohort.title}</h1>
          <p className="mt-3 text-ink-600 leading-relaxed">
            Your enrolment is confirmed instantly after payment. Lessons follow the published cohort schedule
            in {cohort.timezone}.
          </p>
          <section className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#060F26] via-brand-navy to-brand-navy p-6 text-white shadow-brand">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">What you get</h2>
              <span className="rounded-full bg-brand-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-navy">
                Escrow protected
              </span>
            </div>
            <ul className="mt-4 grid gap-3 text-sm text-white/85">
              <li className="flex items-center gap-3"><GraduationCap size={16} className="text-brand-gold" /> Live lessons with an approved, vetted tutor</li>
              <li className="flex items-center gap-3"><BookOpen size={16} className="text-brand-gold" /> Recordings, resources and homework after every lesson</li>
              <li className="flex items-center gap-3"><LineChart size={16} className="text-brand-gold" /> Weekly progress reports for parents</li>
              <li className="flex items-center gap-3"><ShieldCheck size={16} className="text-brand-gold" /> Money-back guarantee while your payment is in escrow</li>
            </ul>
          </section>
        </div>
        <div className="lg:sticky lg:top-28">
          <CheckoutClient cohort={cohort} />
        </div>
      </div>
    </main>
  );
}
