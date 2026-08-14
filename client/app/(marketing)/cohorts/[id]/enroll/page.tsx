import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCohortSSR } from "@/features/cohorts/api/get";
import { CheckoutClient } from "@/features/bookings/components/CheckoutClient";

export const revalidate = 120;

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = buildMetadata({
  title: "Enrol — Secure Checkout",
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
    <main className="container-x py-12">
      <Breadcrumbs items={[
        { name: "Home", href: "/" },
        { name: "Cohorts", href: "/cohorts" },
        { name: cohort.title, href: `/cohorts/${cohort.id}` },
        { name: "Enrol" },
      ]} />
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-start">
        <div>
          <h1 className="text-3xl font-extrabold">Enrol in {cohort.title}</h1>
          <p className="mt-3 text-ink-600 leading-relaxed">
            Your enrolment is confirmed instantly after payment. Lessons follow the published cohort
            schedule in {cohort.timezone}. Your payment is protected by our escrow guarantee.
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
