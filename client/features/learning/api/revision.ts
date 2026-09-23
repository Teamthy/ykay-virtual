import { apiFetch } from "@/lib/api";

export type RevisionPlan = {
  id: string;
  student_profile_id: string;
  subject: string;
  exam: string;
  window_start: string;
  window_end: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  created_at: string;
  updated_at: string;
};

export type RevisionTask = {
  id: string;
  plan_id: string;
  topic: string;
  window_start: string;
  window_end: string;
  status: "PENDING" | "DONE" | "SKIPPED";
  priority: 1 | 2 | 3;
  source: "seeded" | "rebalanced";
  completed_at?: string;
  created_at: string;
};

export async function listRevisionPlans(studentProfileId?: string): Promise<RevisionPlan[]> {
  const q = studentProfileId ? `?student_profile_id=${studentProfileId}` : "";
  const res = await apiFetch<RevisionPlan[]>(`/me/revision-plans${q}`);
  return res.data ?? [];
}

export async function createRevisionPlan(input: {
  subject: string;
  exam?: string;
  window_start: string; // YYYY-MM-DD
  window_end: string;
  studentProfileId?: string;
}): Promise<RevisionPlan> {
  const q = input.studentProfileId ? `?student_profile_id=${input.studentProfileId}` : "";
  const res = await apiFetch<RevisionPlan>(`/me/revision-plans${q}`, {
    method: "POST",
    body: JSON.stringify({
      subject: input.subject,
      exam: input.exam ?? "",
      window_start: input.window_start,
      window_end: input.window_end,
    }),
  });
  return res.data;
}

export async function rebalancePlan(planId: string): Promise<number> {
  const res = await apiFetch<{ reprioritised: number }>(
    `/me/revision-plans/${planId}/rebalance`,
    { method: "POST" },
  );
  return res.data?.reprioritised ?? 0;
}

export async function completeTask(taskId: string): Promise<void> {
  await apiFetch(`/me/revision-plans/tasks/${taskId}/complete`, { method: "POST" });
}
