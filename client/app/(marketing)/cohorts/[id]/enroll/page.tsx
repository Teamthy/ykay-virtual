import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/layout/PageHero";
import { getCohortSSR } from "@/features/cohorts/api/get";
import { CheckoutClient } from "@/features/bookings/components/CheckoutClient";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = buildMetadata({
  title: "Enrol - Secure Checkout",
  description: "Enrol securely in a NUVORA cohort. Funds are held in escrow until lessons are delivered.",
  path: "/cohorts/enroll",
  noIndex: true,
});

export default async function CohortEnrollPage(props: Props) {
  const params = await props.params;
  let cohort;
  try {
    cohort = await getCohortSSR(params.id);
  } catch {
    notFound();
  }
  if (!cohort || cohort.status !== "PUBLISHED") notFound();

  return (
    <main>
      <PageHero
        cover="/hero/checkout.jpg"
        title={`Enrol in ${cohort.title}`}
        subtitle={`Your enrolment is confirmed after payment. Lessons follow the published schedule in ${cohort.timezone}. Payment is held in escrow until lessons are delivered.`}
        crumbs={[{ name: "Home", href: "/" }, { name: "Cohorts", href: "/cohorts" }, { name: cohort.title, href: `/cohorts/${cohort.id}` }, { name: "Enrol" }]}
        image={{ src: "/hero/utme.jpg", alt: "Students in a live NUVORA cohort class" }}
      />

      <div className="container-x mx-auto max-w-5xl space-y-8 pb-20 pt-16 md:pt-20">
        <CheckoutClient cohort={cohort} />
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-display text-lg tracking-[0.02em] text-brand-navy">What you get</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-600">
            <li>Live lessons with an approved, vetted tutor</li>
            <li>Recordings, resources and homework after every lesson</li>
            <li>Weekly progress reports for parents</li>
            <li>Unused escrow balances are refundable per policy</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
