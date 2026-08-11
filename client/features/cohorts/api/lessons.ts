import { apiFetchSSR, apiFetch } from "@/lib/api";

export type CohortLesson = {
  id: string;
  cohort_id?: string;
  private_package_id?: string;
  tutor_profile_id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  timezone: string;
  meeting_url?: string;
  meeting_provider: string;
  status: string;
};

export type CohortResource = {
  id: string;
  title: string;
  description?: string;
  file_url?: string;
  is_public: boolean;
  created_at: string;
};

export type CohortAssignment = {
  id: string;
  title: string;
  instructions?: string;
  due_at?: string;
  max_score?: number;
};

/** Session schedule for a cohort (SSR for the detail page). */
export async function getCohortLessonsSSR(cohortId: string): Promise<CohortLesson[]> {
  const res = await apiFetchSSR<CohortLesson[]>(`/cohorts/${cohortId}/lessons`);
  return res.data ?? [];
}

export async function getCohortResources(cohortId: string): Promise<CohortResource[]> {
  const res = await apiFetch<CohortResource[]>(`/cohorts/${cohortId}/resources`);
  return res.data ?? [];
}

export async function getCohortAssignments(cohortId: string): Promise<CohortAssignment[]> {
  const res = await apiFetch<CohortAssignment[]>(`/cohorts/${cohortId}/assignments`);
  return res.data ?? [];
}
