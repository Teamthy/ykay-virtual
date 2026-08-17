import { apiFetch } from "./api";

// Account + settings + auth-completion fetchers. Types mirror the Go DTOs.

export type Me = {
  id: string;
  email: string;
  roles: string[];
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
};

export type Learner = {
  id: string;
  first_name: string;
  last_name?: string | null;
  date_of_birth?: string | null;
  current_level?: string | null;
  school_name?: string | null;
  relationship?: string | null;
};

export type ReferralCode = {
  code: string;
  is_active: boolean;
  reward: number;
  currency: string;
  share_link: string;
};

export type Referral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code_id: string;
  order_id?: string | null;
  reward_amount: number;
  status: string;
  qualified_at?: string | null;
  rewarded_at?: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  parent_user_id: string;
  student_profile_id?: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  checkout_cohort_id?: string | null;
};

export function updateProfile(input: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
}): Promise<Me> {
  return apiFetch<Me>("/auth/me/profile", { method: "PUT", body: JSON.stringify(input) }).then((r) => r.data);
}

export function listLearners(): Promise<Learner[]> {
  return apiFetch<Learner[]>("/me/learners").then((r) => r.data ?? []);
}

export function createLearner(input: {
  first_name: string;
  last_name?: string;
  date_of_birth?: string;
  current_level?: string;
  relationship?: string;
}): Promise<Learner> {
  return apiFetch<Learner>("/me/learners", { method: "POST", body: JSON.stringify(input) }).then((r) => r.data);
}

export function getReferralCode(): Promise<ReferralCode> {
  return apiFetch<ReferralCode>("/me/referral-code").then((r) => r.data);
}

export function listReferrals(): Promise<Referral[]> {
  return apiFetch<Referral[]>("/me/referrals").then((r) => r.data ?? []);
}

export function applyReferral(code: string): Promise<unknown> {
  return apiFetch<unknown>("/referrals/apply", { method: "POST", body: JSON.stringify({ code }) }).then((r) => r.data);
}

export function listOrders(): Promise<Order[]> {
  return apiFetch<Order[]>("/me/orders").then((r) => r.data ?? []);
}

export function requestPasswordReset(email: string): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  }).then((r) => r.data);
}

export function confirmPasswordReset(token: string, newPassword: string): Promise<{ reset: boolean }> {
  return apiFetch<{ reset: boolean }>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  }).then((r) => r.data);
}

export function resendVerification(email: string): Promise<{ sent: boolean }> {
  return apiFetch<{ sent: boolean }>("/auth/verify-email/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  }).then((r) => r.data);
}

export function confirmVerification(token: string): Promise<unknown> {
  return apiFetch<unknown>("/auth/verify-email/confirm", { method: "POST", body: JSON.stringify({ token }) }).then((r) => r.data);
}

export function deleteAccount(): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>("/auth/me/delete", { method: "POST" }).then((r) => r.data);
}

export function formatNaira(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}
