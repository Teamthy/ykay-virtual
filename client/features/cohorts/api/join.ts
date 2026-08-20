import { apiFetch } from "@/lib/api";

/** Approved tutor requests to teach a cohort. Admin still assigns on approve. */
export async function requestCohortJoin(cohortId: string, note?: string): Promise<void> {
  await apiFetch(`/me/cohorts/${cohortId}/join`, {
    method: "POST",
    body: JSON.stringify({ note: note || undefined }),
  });
}
