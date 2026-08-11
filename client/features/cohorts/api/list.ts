import { apiFetch, Envelope } from "@/lib/api";
import type { Cohort } from "./get";

export type CohortListParams = {
  programme_id?: string;
  page?: number;
  page_size?: number;
};

export async function listCohorts(params: CohortListParams = {}): Promise<Envelope<Cohort[]>> {
  const qs = new URLSearchParams();
  if (params.programme_id) qs.set("programme_id", params.programme_id);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 20));
  return apiFetch<Cohort[]>(`/cohorts?${qs}`);
}
