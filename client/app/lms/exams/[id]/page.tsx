"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getExamPaper } from "@/features/cbt/api";
import { ExamPlayer } from "@/components/cbt/ExamPlayer";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

// /lms/exams/[id] — the paper page. Fetches the paper (questions WITHOUT the
// answer key) and hands it to the runner, which owns the sitting lifecycle.

export default function ExamPage() {
  const { id } = useParams<{ id: string }>();
  const paper = useQuery({
    queryKey: ["cbt", "paper", id],
    queryFn: () => getExamPaper(id),
    staleTime: 60_000,
    retry: false,
  });

  return (
    <DashboardPage className="space-y-6">
      <Link
        href="/lms/exams"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-dark hover:underline"
      >
        <ArrowLeft size={15} /> Practice exams
      </Link>

      {paper.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      ) : paper.error ? (
        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-8 text-center">
          <AlertTriangle size={28} className="mx-auto text-orange-500" />
          <p className="mt-3 font-bold text-ink-800">
            This paper is not available
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {paper.error instanceof Error
              ? paper.error.message
              : "Please try again later."}
          </p>
        </div>
      ) : paper.data ? (
        <ExamPlayer paper={paper.data} />
      ) : null}
    </DashboardPage>
  );
}
