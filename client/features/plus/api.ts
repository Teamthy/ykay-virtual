"use client";

import { apiFetch } from "@/lib/api";

export type PlusPlan = {
  id: string;
  code: "PLUS" | "PLUS_FAMILY" | "PLUS_TEAMS";
  name: string;
  billing: "MONTHLY" | "ANNUAL";
  price: number;
  currency: string;
  trial_days: number;
  is_active: boolean;
};

export type Entitlements = {
  cbt_vault: boolean;
  verified_certs: boolean;
  transcripts: boolean;
  ai_assistant: boolean;
  ai_assist_per_day: number;
};

export type PlusStatus = {
  active: boolean;
  subscription?: {
    id: string;
    plan_code: string;
    status: string;
    started_at: string;
    trial_ends_at?: string | null;
    ends_at: string;
    auto_renew: boolean;
  } | null;
  plan?: PlusPlan | null;
  entitlements: Entitlements;
};

export async function getMyPlus(): Promise<PlusStatus> {
  const res = await apiFetch<PlusStatus>("/me/plus");
  return res.data;
}

export async function listPlusPlans(): Promise<PlusPlan[]> {
  const res = await apiFetch<PlusPlan[]>("/plus/plans");
  return res.data ?? [];
}

export async function activatePlus(planCode: string, trial = false): Promise<{ id: string }> {
  const res = await apiFetch<{ id: string }>("/me/plus/activate", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode, trial }),
  });
  return res.data;
}

export type PlusOrder = {
  order: { id: string; order_number: string; total_amount: number; currency: string };
};

/** Order-backed purchase: creates a PENDING order; pay via the normal flow, activated on settlement. */
export async function purchasePlus(planCode: string): Promise<PlusOrder> {
  const res = await apiFetch<PlusOrder>("/me/plus/purchase", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
  return res.data;
}

export type Advisor = {
  id: string;
  user_id: string;
  advisor_user_id: string;
  note?: string | null;
  advisor_name: string;
  advisor_email: string;
};

export type LearningPlan = {
  id: string;
  user_id: string;
  student_profile_id: string;
  goals?: string | null;
  focus_areas?: string | null;
  recommendations?: string | null;
  status: string;
  source?: "MANUAL" | "DIAGNOSTIC";
};

export async function getMyAdvisor(): Promise<Advisor> {
  const res = await apiFetch<Advisor>("/me/advisor");
  return res.data;
}

export async function getMyLearningPlan(studentProfileId: string): Promise<LearningPlan> {
  const res = await apiFetch<LearningPlan>(`/me/advisor/plan?student_profile_id=${encodeURIComponent(studentProfileId)}`);
  return res.data;
}

// --- Plus Teams (institution seat management) ---

export type PlusTeamsAllocation = {
  institution_id: string;
  total_seats: number;
  used_seats: number;
};

export type PlusTeamsSeat = {
  id: string;
  institution_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
};

export async function getPlusTeamsAllocation(institutionId: string): Promise<PlusTeamsAllocation> {
  const res = await apiFetch<PlusTeamsAllocation>(`/me/institutions/${institutionId}/plus`);
  return res.data;
}

export async function setPlusTeamsSeats(institutionId: string, totalSeats: number): Promise<PlusTeamsAllocation> {
  const res = await apiFetch<PlusTeamsAllocation>(`/me/institutions/${institutionId}/plus/seats`, {
    method: "PUT",
    body: JSON.stringify({ total_seats: totalSeats }),
  });
  return res.data;
}

export async function listPlusTeamsSeats(institutionId: string): Promise<PlusTeamsSeat[]> {
  const res = await apiFetch<PlusTeamsSeat[]>(`/me/institutions/${institutionId}/plus/seats`);
  return res.data ?? [];
}

export async function assignPlusTeamSeat(institutionId: string, userId: string): Promise<PlusTeamsSeat> {
  const res = await apiFetch<PlusTeamsSeat>(`/me/institutions/${institutionId}/plus/seats`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  return res.data;
}

export async function releasePlusTeamSeat(institutionId: string, userId: string): Promise<void> {
  await apiFetch(`/me/institutions/${institutionId}/plus/seats/${userId}`, { method: "DELETE" });
}

export async function cancelPlus(): Promise<void> {
  await apiFetch("/me/plus/cancel", { method: "POST" });
}
