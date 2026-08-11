import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata, courseJsonLd } from "@/lib/seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getCohortSSR } from "@/features/cohorts/api/get";
import { getCohortLessonsSSR } from "@/features/cohorts/api/lessons";
import Link from "next/link";

export const revalidate = 300;

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const cohort = await getCohortSSR(params.id);
    return buildMetadata({
      title: `${cohort.title} — Cohort Sessions & Enrolment | YKAY`,
      description: cohort.schedule_description ?? `Join the ${cohort.title} cohort — ${cohort.capacity} seats, ${cohort.timezone}, ${cohort.currency} ${cohort.fee.toLocaleString()}. Escrow-protected.`,
      path: `/cohorts/${params.id}`,
    });
  } catch {
    return buildMetadata({ title: "Cohort Not Found", description: "Cohort not found", path: `/cohorts/${params.id}`, noIndex: true });
  }
}

const LESSON_STATUS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  ONGOING: "bg-green-100 text-green-700",
  COMPLETED: "bg-ink-100 text-ink-500",
  CANCELLED: "bg-red-100 text-red-700",
  RESCHEDULED: "bg-amber-100 text-amber-700",
};

export default async function CohortDetailPage({ params }: Props) {
  let cohort;
  try {
    cohort = await getCohortSSR(params.id);
  } catch {
    notFound();
  }
  if (cohort.status !== "PUBLISHED") notFound();

  let lessons: Awaited<ReturnType<typeof getCohortLessonsSSR>> = [];
  try {
    lessons = await getCohortLessonsSSR(params.id);
  } catch {
    lessons = [];
  }

  const seatsLeft = Math.max(0, cohort.capacity - cohort.enrolled_count);
  const full = seatsLeft === 0;
  const course = courseJsonLd({
    name: cohort.title,
    description: cohort.schedule_description ?? `${cohort.title} cohort at YKAY Virtual School.`,
    provider: "YKAY Virtual School",
    url: `https://ykayvirtual.com/cohorts/${cohort.id}`,
  });

  return (
    <main className="container-x py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(course) }} />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Cohorts", href: "/cohorts" }, { name: cohort.title }]} />

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        {/* Left: info + sessions */}
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-brand-blue bg-brand-blue/10 px-2.5 py-1 rounded-full">
            {cohort.location_mode.replace(/_/g, " ").toLowerCase()} · {cohort.timezone}
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3">{cohort.title}</h1>
          <p className="mt-3 text-ink-600 leading-relaxed">
            {cohort.schedule_description ?? "A structured small-group learning cohort led by a vetted YKAY tutor."}
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { label: "Starts", value: new Date(cohort.start_date).toLocaleDateString() },
              { label: "Ends", value: new Date(cohort.end_date).toLocaleDateString() },
              { label: "Seats", value: `${cohort.enrolled_count}/${cohort.capacity} taken` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-ink-50 p-4 text-center">
                <div className="text-xs text-ink-500">{s.label}</div>
                <div className="font-bold mt-0.5">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Session schedule */}
          <section className="mt-8">
            <h2 className="text-xl font-extrabold mb-4">Session schedule</h2>
            {lessons.length === 0 ? (
              <p className="text-sm text-ink-500 border border-dashed border-ink-200 rounded-xl p-6 text-center">
                The full session schedule is released to enrolled families shortly before the cohort begins.
              </p>
            ) : (
              <ul className="space-y-3">
                {lessons.map((l, i) => (
                  <li key={l.id} className="border rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{l.title}</div>
                        <div className="text-xs text-ink-500">
                          {new Date(l.start_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {l.timezone}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${LESSON_STATUS[l.status] ?? "bg-ink-100"}`}>
                      {l.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: enrol card */}
        <div className="lg:sticky lg:top-28">
          <div className="border rounded-2xl p-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold text-lg">Enrol in this cohort</h2>
              <span className="text-2xl font-extrabold text-brand-blue">
                {cohort.currency} {cohort.fee.toLocaleString()}
              </span>
            </div>
            <p className={`text-sm font-semibold ${full ? "text-red-600" : "text-green-700"}`}>
              {full ? "Cohort is full" : `${seatsLeft} of ${cohort.capacity} seats available`}
            </p>
            <ul className="space-y-2 text-sm text-ink-600">
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Live lessons with a vetted tutor</li>
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Recordings, resources and homework</li>
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Weekly progress reports for parents</li>
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Escrow-protected payment</li>
            </ul>
            {full ? (
              <button disabled className="btn-gold w-full opacity-50 cursor-not-allowed">Cohort full</button>
            ) : (
              <Link href={`/cohorts/${cohort.id}/enroll`} className="btn-gold w-full inline-flex items-center justify-center">
                Enrol now — pay securely
              </Link>
            )}
            <p className="text-[11px] text-ink-400 text-center">
              Payment is held in escrow until lessons are delivered (or refunded per policy).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
