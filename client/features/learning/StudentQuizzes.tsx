"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList, FileText } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import {
  listAssessments,
  listProgressReports,
  startAssessment,
  submitAssessment,
  type AssessmentResult,
  type AssessmentStart,
} from "./api";

// Student quizzes + released progress reports (working-doc §13): one attempt
// per assessment, auto-graded on submit, results visible instantly.

export function StudentQuizzes({ studentId }: { studentId?: string }) {
  const { context, isLoading: sessionLoading } = useSession();
  const resolvedStudentId = studentId ?? context?.student?.id ?? context?.learners[0]?.id;
  const qc = useQueryClient();
  const [session, setSession] = useState<AssessmentStart | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const assessments = useQuery({
    queryKey: ["student", "assessments"],
    queryFn: () => listAssessments(),
    staleTime: 30_000,
  });

  const reports = useQuery({
    queryKey: ["student", "progress-reports"],
    queryFn: () => listProgressReports(resolvedStudentId!),
    enabled: !!resolvedStudentId,
    staleTime: 30_000,
  });

  const start = useMutation({
    mutationFn: (id: string) => startAssessment(id, resolvedStudentId!),
    onSuccess: (data) => {
      setSession(data);
      setResult(null);
      setAnswers({});
      qc.invalidateQueries({ queryKey: ["student", "assessments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start quiz"),
  });

  const submit = useMutation({
    mutationFn: () => {
      const payload = Object.entries(answers).map(([questionId, chosenIndex]) => ({
        question_id: questionId,
        chosen_index: chosenIndex,
      }));
      return submitAssessment(session!.attempt.assessment_id, resolvedStudentId!, payload);
    },
    onSuccess: (data) => {
      setResult(data);
      setSession(null);
      toast.success(data.passed ? "Quiz passed — well done!" : "Quiz submitted.");
      qc.invalidateQueries({ queryKey: ["student", "assessments"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit quiz"),
  });

  if (sessionLoading) return <Skeleton className="h-32 w-full" />;
  if (!resolvedStudentId) return <EmptyState icon={<ClipboardList size={20} />} title="No learner profile yet" description="Complete learner onboarding or ask your parent to link your learner profile." />;

  const answered = Object.keys(answers).length;
  const allAnswered = session ? answered === session.questions.length : false;

  if (session) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{session.title || "Quiz in progress"}</h2>
            <p className="text-sm text-ink-500">
              Pass threshold: {Math.round(session.pass_threshold * 100)}% · {answered}/{session.questions.length} answered
            </p>
          </div>
          <Button variant="outline" onClick={() => setSession(null)}>
            Cancel
          </Button>
        </div>

        {session.questions.map((q, qi) => (
          <Card key={q.id}>
            <CardContent className="pt-5">
              <p className="font-semibold">
                {qi + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                      answers[q.id] === oi ? "border-brand-blue bg-blue-50" : "hover:bg-ink-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      className="accent-[#0b3b8c]"
                      checked={answers[q.id] === oi}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Grading…" : "Submit quiz"}
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        <Card className={result.passed ? "border-green-200" : "border-red-200"}>
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-extrabold">
              {result.correct}/{result.total}
            </p>
            <p className={`mt-2 font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
              {result.passed ? "Passed 🎉" : "Not passed — keep practising!"}
            </p>
            <p className="mt-1 text-sm text-ink-500">Score {Math.round(result.score * 100)}%</p>
            <Button className="mt-4" onClick={() => setResult(null)}>
              Back to quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Quizzes & assessments</h2>
        <p className="text-sm text-ink-500">One attempt per quiz — your result is graded automatically.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {assessments.isLoading && <Skeleton className="h-28" />}
        {(assessments.data ?? []).map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <CardTitle className="text-base">{a.title}</CardTitle>
              {a.instructions && <p className="text-sm text-ink-500">{a.instructions}</p>}
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-xs text-ink-400">
                Pass: {Math.round(a.pass_threshold * 100)}%{a.due_at ? ` · Due ${new Date(a.due_at).toLocaleDateString()}` : ""}
              </span>
              <Button size="sm" disabled={start.isPending} onClick={() => start.mutate(a.id)}>
                {start.isPending ? "Starting…" : "Take quiz"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {!assessments.isLoading && (assessments.data ?? []).length === 0 && (
          <div className="md:col-span-2">
            <EmptyState
              icon={<ClipboardList size={20} />}
              title="No quizzes published yet"
              description="When your tutor publishes a quiz it will appear here, ready to take."
            />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold mt-8">Progress reports</h2>
        <div className="mt-3 space-y-3">
          {reports.isLoading && <Skeleton className="h-24" />}
          {(reports.data ?? []).map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">
                    {new Date(r.period_start).toLocaleDateString()} – {new Date(r.period_end).toLocaleDateString()}
                  </p>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {r.overall_rating}/5
                  </span>
                </div>
                {r.strengths && <p className="mt-2 text-sm"><b>Strengths:</b> {r.strengths}</p>}
                {r.weaknesses && <p className="mt-1 text-sm"><b>Areas to improve:</b> {r.weaknesses}</p>}
                {r.recommendations && <p className="mt-1 text-sm"><b>Recommendations:</b> {r.recommendations}</p>}
              </CardContent>
            </Card>
          ))}
          {!reports.isLoading && (reports.data ?? []).length === 0 && (
            <EmptyState
              icon={<FileText size={20} />}
              title="No progress reports yet"
              description="Reports written by your tutor appear here — you and your parent can see them."
            />
          )}
        </div>
      </div>
    </div>
  );
}
