import { apiFetch } from "@/lib/api";
import { apiFetchSSR } from "@/lib/server-api";

export type WaitlistEntry = {
  id: string;
  cohort_id: string;
  user_id: string;
  position: number;
  notified_at?: string;
  created_at: string;
};

/** Visible waitlist size for a cohort — real data only (never fabricated). */
export async function getWaitlistCount(cohortId: string): Promise<number> {
  const res = await apiFetchSSR<{ waiting: number }>(`/cohorts/${cohortId}/waitlist`);
  return res.data?.waiting ?? 0;
}

/** Join a full cohort's waitlist. Idempotent per user. */
export async function joinWaitlist(cohortId: string): Promise<WaitlistEntry> {
  const res = await apiFetch<WaitlistEntry>(`/me/cohorts/${cohortId}/waitlist`, { method: "POST" });
  return res.data;
}

/** Leave a cohort's waitlist. */
export async function leaveWaitlist(cohortId: string): Promise<void> {
  await apiFetch(`/me/cohorts/${cohortId}/waitlist`, { method: "DELETE" });
}

/** My position in a cohort's waitlist (null when not waiting). */
export async function getMyWaitlist(cohortId: string): Promise<WaitlistEntry | null> {
  const res = await apiFetch<WaitlistEntry | null>(`/me/cohorts/${cohortId}/waitlist`);
  return res.data ?? null;
}

/** Admin: ordered waitlist for a cohort. */
export async function adminListWaitlist(cohortId: string): Promise<WaitlistEntry[]> {
  const res = await apiFetch<WaitlistEntry[]>(`/admin/cohorts/${cohortId}/waitlist`);
  return res.data ?? [];
}

/** Admin: manually notify the front of the waitlist (idempotent). */
export async function adminNotifyWaitlist(cohortId: string): Promise<{ notified: number }> {
  const res = await apiFetch<{ notified: number }>(
    `/admin/cohorts/${cohortId}/waitlist/notify`,
    { method: "POST" },
  );
  return res.data;
}
