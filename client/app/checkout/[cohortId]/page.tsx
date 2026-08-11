import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata, breadcrumbJsonLd } from "@/lib/seo";
import { getCohortSSR } from "@/features/cohorts/api/get";
import { CheckoutClient } from "@/features/bookings/components/CheckoutClient";

type Props = { params: { cohortId: string } };

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildMetadata({
    title: "Checkout — Enrol securely",
    description: "Pay securely. Funds are held in escrow until lessons are delivered.",
    path: `/checkout/${params.cohortId}`,
    noIndex: true, // checkout is an app surface, not an indexable page
  });
}

export default async function CheckoutPage({ params }: Props) {
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
          <h1 className="text-3xl font-extrabold">Enrol in {cohort.title}</h1>
          <p className="mt-3 text-ink-600 leading-relaxed">
            Your enrolment is confirmed instantly after payment. Lessons follow the published cohort schedule
            in {cohort.timezone}. Your payment is protected by our escrow guarantee — if the tutor cannot
            deliver, you get a full refund.
          </p>
          <section className="mt-8 rounded-2xl border p-6">
            <h2 className="font-bold">What you get</h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600 list-disc pl-5">
              <li>Live lessons with an approved, vetted tutor</li>
              <li>Recordings, resources and homework after every lesson</li>
              <li>Weekly progress reports for parents</li>
              <li>Money-back guarantee while your payment is in escrow</li>
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
