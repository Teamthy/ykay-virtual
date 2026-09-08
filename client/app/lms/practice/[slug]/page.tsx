"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { drawBankPaper, listBankTopics } from "@/features/cbt/api";
import { PracticePlayer } from "@/components/cbt/PracticePlayer";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";

// /lms/practice/[slug] — one sitting from the shared bank. The query key
// carries a nonce so "Practise again" forces a NEW random draw from the
// server (per-student variation is the whole point of the bank).

export default function PracticeSittingPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [nonce, setNonce] = useState(0);
  const [limit, setLimit] = useState(20);
  const [difficulty, setDifficulty] = useState(0); // 0 = mixed
  const [duration, setDuration] = useState(0); // 0 = untimed
  const [topic, setTopic] = useState("");

  const topics = useQuery({
    queryKey: ["cbt", "bank", "topics", slug],
    queryFn: () => listBankTopics(slug),
    staleTime: 60_000,
  });

  const paper = useQuery({
    queryKey: [
      "cbt",
      "bank",
      "paper",
      slug,
      limit,
      difficulty,
      duration,
      topic,
      nonce,
    ],
    queryFn: () => drawBankPaper(slug, limit, difficulty, duration, topic),
    staleTime: Infinity, // the sitting owns this draw; no background refetch
    retry: false,
  });

  return (
    <DashboardPage className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/lms/practice"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"
        >
          <ArrowLeft size={15} /> CBT Practice
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Questions
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setNonce((n) => n + 1);
              }}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold text-deep"
            >
              {[10, 20, 30, 40, 50, 60].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(Number(e.target.value));
                setNonce((n) => n + 1);
              }}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold text-deep"
            >
              <option value={0}>Mixed</option>
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Topic
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setNonce((n) => n + 1);
              }}
              className="max-w-[12rem] rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold text-deep"
            >
              <option value="">All topics</option>
              {(topics.data ?? []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">
            Time
            <select
              value={duration}
              onChange={(e) => {
                setDuration(Number(e.target.value));
                setNonce((n) => n + 1);
              }}
              className="rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-sm font-bold text-deep"
            >
              <option value={0}>Untimed</option>
              {[10, 20, 30, 45, 60, 90].map((n) => (
                <option key={n} value={n}>
                  {n} min
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {paper.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      ) : paper.error ? (
        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center">
          <AlertTriangle size={28} className="mx-auto text-orange-500" />
          <p className="mt-3 font-bold text-ink-800">
            No paper available for this subject
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {paper.error instanceof Error
              ? paper.error.message
              : "Please try again later."}
          </p>
        </div>
      ) : paper.data ? (
        <PracticePlayer
          key={`${nonce}-${paper.data.questions[0]?.id ?? "x"}`}
          paper={paper.data}
          redrawing={paper.isFetching}
          onRedraw={() => {
            setNonce((n) => n + 1);
            void qc.invalidateQueries({
              queryKey: ["cbt", "bank", "paper", slug],
            });
          }}
        />
      ) : null}
    </DashboardPage>
  );
}
