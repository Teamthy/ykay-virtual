import { API_BASE, apiFetchSSR } from "@/lib/server-api";

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
  /** FR-25 enrolment window — absent = open while published, until end_date. */
  enrollment_opens_at?: string;
  enrollment_closes_at?: string;
};

/** Client-side mirror of the server's enrolment-window gate (FR-25). The
 * server enforces this at booking time; the UI uses it to disable checkout
 * with a clear message instead of a late 409. */
export function enrollmentWindow(c: Cohort, now = new Date()): { open: boolean; reason?: string } {
  if (c.enrollment_opens_at && now < new Date(c.enrollment_opens_at)) {
    return { open: false, reason: `Enrolment opens ${new Date(c.enrollment_opens_at).toLocaleDateString()}` };
  }
  if (c.enrollment_closes_at && now > new Date(c.enrollment_closes_at)) {
    return { open: false, reason: "Enrolment for this cohort has closed" };
  }
  if (c.end_date && now > new Date(c.end_date)) {
    return { open: false, reason: "This cohort has ended" };
  }
  return { open: true };
}

/** SSR/SSG fetch for the checkout page (ISR 300s via apiFetchSSR). */
export async function getCohortSSR(id: string): Promise<Cohort> {
  const res = await apiFetchSSR<Cohort>(`/cohorts/${id}`);
  return res.data;
}
