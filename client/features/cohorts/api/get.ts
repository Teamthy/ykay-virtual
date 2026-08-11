import { apiFetchSSR } from "@/lib/api";

export type Cohort = {
  id: string;
  programme_id: string;
  title: string;
  slug: string;
  tutor_profile_id?: string;
  capacity: number;
  enrolled_count: number;
  start_date: string;
  end_date: string;
  schedule_description?: string;
  timezone: string;
  location_mode: "ONLINE" | "IN_PERSON" | "HYBRID";
  fee: number;
  currency: string;
  status: "DRAFT" | "PUBLISHED" | "FULL" | "ONGOING" | "COMPLETED" | "CANCELLED";
};

/** SSR/SSG fetch for the checkout page (ISR 300s via apiFetchSSR). */
export async function getCohortSSR(id: string): Promise<Cohort> {
  const res = await apiFetchSSR<Cohort>(`/cohorts/${id}`);
  return res.data;
}
