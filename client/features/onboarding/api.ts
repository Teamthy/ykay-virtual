import { apiFetch } from "@/lib/api";

export type Learner = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  school_name?: string;
  current_level?: string;
  timezone: string;
  created_at: string;
};

export type CreateLearnerInput = {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  school_name?: string;
  current_level?: string;
  relationship?: string;
};

export async function createLearner(input: CreateLearnerInput): Promise<Learner> {
  const res = await apiFetch<Learner>("/me/learners", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}

export async function listLearners(): Promise<Learner[]> {
  const res = await apiFetch<Learner[]>("/me/learners");
  return res.data ?? [];
}
