"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

// Programme detail tabs (working-doc §8.3): Overview | Topics | Cohorts |
// Private Tuition | Tutors | FAQ.

type ProgrammeDetail = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  format: string;
  curriculum_name?: string;
  level_name?: string;
  exam_name?: string;
  subjects?: string[];
  price_min?: number;
  price_max?: number;
  currency: string;
  next_start?: string;
};

type Cohort = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  schedule_description?: string;
  timezone: string;
  capacity: number;
  enrolled_count: number;
  fee: number;
  currency: string;
  status: string;
};

type Tutor = {
  id: string;
  slug: string;
  display_name: string;
  rating_avg: number;
  rating_count: number;
};

const TABS = ["Overview", "Topics", "Cohorts", "Private Tuition", "Tutors", "FAQ"] as const;

export function ProgrammeDetailTabs({ programme }: { programme: ProgrammeDetail }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");

  const cohorts = useQuery({
    queryKey: ["programme", programme.id, "cohorts"],
    queryFn: async () => {
      const res = await apiFetch<Cohort[]>(`/cohorts?programme_id=${programme.id}&page_size=20`);
      return (res.data ?? []).filter((c) => c.status === "PUBLISHED");
    },
    staleTime: 60_000,
  });

  const tutors = useQuery({
    queryKey: ["programme", programme.id, "tutors"],
    queryFn: async () => {
      const res = await apiFetch<Tutor[]>(`/programmes/${programme.slug}/tutors`);
      return res.data ?? [];
    },
    staleTime: 120_000,
  });

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-ink-100 pb-px">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t ? "text-brand-blue border-b-2 border-brand-blue" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "Overview" && (
          <div className="max-w-3xl space-y-6">
            <section>
              <h2 className="text-xl font-extrabold mb-3">About this programme</h2>
              <p className="text-ink-700 leading-relaxed whitespace-pre-line">
                {programme.description ?? programme.title}
              </p>
            </section>
            <section>
              <h2 className="text-xl font-extrabold mb-3">Who it&apos;s for</h2>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>{programme.level_name ?? "Learners at the programme's level"} students</li>
                {programme.exam_name && <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Learners preparing for {programme.exam_name}</li>}
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Families who want structured, accountable learning</li>
              </ul>
            </section>
            <section>
              <h2 className="text-xl font-extrabold mb-3">What&apos;s included</h2>
              <ul className="space-y-2 text-sm text-ink-700">
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Live lessons with a vetted, competency-assessed tutor</li>
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Resources, homework and lesson notes after every session</li>
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Weekly progress reports for parents</li>
                <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Escrow-protected payment</li>
              </ul>
            </section>
          </div>
        )}

        {tab === "Topics" && (
          <div className="max-w-3xl">
            <h2 className="text-xl font-extrabold mb-3">Curriculum topics</h2>
            <p className="text-sm text-ink-600 mb-4">
              The topic list follows the {programme.curriculum_name ?? "relevant"} curriculum{programme.exam_name ? ` and the ${programme.exam_name} syllabus` : ""}.
            </p>
            <ol className="space-y-2.5">
              {topicsFor(programme).map((t, i) => (
                <li key={t} className="flex gap-3 border rounded-xl px-4 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold">{i + 1}</span>
                  <span className="text-ink-700">{t}</span>
                </li>
              ))}
            </ol>
            <Link href="/private-tuition" className="btn-gold mt-6 inline-block text-sm">Request a full topic plan</Link>
          </div>
        )}

        {tab === "Cohorts" && (
          <div>
            <h2 className="text-xl font-extrabold mb-4">Available cohorts</h2>
            {cohorts.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (cohorts.data?.length ?? 0) === 0 ? (
              <div className="border border-dashed border-ink-200 rounded-2xl p-8 text-center text-sm text-ink-500">
                No cohorts are open for enrolment yet — new cohorts launch regularly.{" "}
                <Link href="/private-tuition" className="text-brand-blue font-semibold hover:underline">Request private tuition</Link> in the meantime.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {cohorts.data?.map((c) => {
                  const seatsLeft = Math.max(0, c.capacity - c.enrolled_count);
                  return (
                    <div key={c.id} className="border rounded-2xl p-5">
                      <h3 className="font-bold text-sm">{c.title}</h3>
                      <p className="mt-1.5 text-xs text-ink-500">
                        {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} →{" "}
                        {new Date(c.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {c.timezone}
                      </p>
                      {c.schedule_description && <p className="mt-1 text-xs text-ink-500">{c.schedule_description}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-bold text-ink-600">{seatsLeft > 0 ? `${seatsLeft} seats left` : "Full"}</span>
                        <span className="font-extrabold text-brand-blue">{c.currency} {c.fee.toLocaleString()}</span>
                      </div>
                      <Link href={seatsLeft > 0 ? `/cohorts/${c.id}/enroll` : `/cohorts/${c.id}`}
                        className={`mt-3 block text-center rounded-xl py-2.5 text-sm font-bold ${seatsLeft > 0 ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "bg-ink-100 text-ink-400"}`}>
                        {seatsLeft > 0 ? "Join cohort" : "View cohort"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "Private Tuition" && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-extrabold mb-3">One-to-one support</h2>
            <p className="text-sm text-ink-600 leading-relaxed">
              Prefer one-to-one? Request private tuition and our advisors match your learner with a
              vetted tutor for {programme.title} — tailored pace, schedule and goals.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Custom schedule around your family&apos;s week</li>
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Lesson notes and homework after every session</li>
              <li className="flex gap-2"><span className="text-brand-blue font-bold">✓</span>Escrow-protected payment</li>
            </ul>
            <Link href="/private-tuition" className="btn-gold mt-6 inline-block text-sm">Request a tutor</Link>
          </div>
        )}

        {tab === "Tutors" && (
          <div>
            <h2 className="text-xl font-extrabold mb-4">Tutors for this programme</h2>
            {tutors.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (tutors.data?.length ?? 0) === 0 ? (
              <div className="border border-dashed border-ink-200 rounded-2xl p-8 text-center text-sm text-ink-500">
                Approved tutors for this programme appear here as cohorts are assigned.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {tutors.data?.map((t) => (
                  <div key={t.id} className="border rounded-2xl p-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white font-bold">
                        {t.display_name.slice(0, 1)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{t.display_name}</p>
                        <p className="text-xs text-ink-500">★ {t.rating_avg.toFixed(1)} · {t.rating_count} reviews · verified</p>
                      </div>
                    </div>
                    <Link href={`/tutors/${t.slug}`} className="text-xs font-semibold text-brand-blue hover:underline shrink-0">View profile</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "FAQ" && (
          <div className="max-w-2xl space-y-3">
            {[
              { q: "Who is this programme for?", a: `${programme.title} is designed for learners at the ${programme.level_name ?? "appropriate"} level${programme.exam_name ? ` preparing for ${programme.exam_name}` : ""}.` },
              { q: "How do I enrol?", a: "Pick a cohort from the Cohorts tab and enrol securely — your fee is held in escrow until lessons are delivered. Private tuition is also available." },
              { q: "Can I change or cancel?", a: "Rescheduling is free within your package window. Cancellations follow our published policy; unused escrow balances are refundable per policy." },
            ].map((f) => (
              <details key={f.q} className="border rounded-xl px-5 py-4">
                <summary className="font-semibold cursor-pointer text-sm">{f.q}</summary>
                <p className="mt-2 text-sm text-ink-600">{f.a}</p>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function topicsFor(p: ProgrammeDetail): string[] {
  const base = `${p.title} — foundations and key concepts`;
  const exam = p.exam_name ? `Working through ${p.exam_name} past questions and mark schemes` : "Practical application and problem-solving";
  const level = p.level_name ? `Skills and techniques expected at ${p.level_name}` : "Core skills and techniques";
  return [
    base,
    level,
    exam,
    "Revision, mocks and exam technique",
    "Progress review with weekly parent reports",
  ];
}

export { Button };
