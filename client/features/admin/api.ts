import { apiFetch, Envelope } from "@/lib/api";

// Admin console API — all endpoints require the session cookie with an
// ACADEMIC_ADMIN / SUPER_ADMIN role (enforced server-side).

export type AdminStats = {
  users: number;
  active_users: number;
  tutors_total: number;
  tutors_approved: number;
  tutors_pending: number;
  orders_total: number;
  orders_paid: number;
  revenue_in_escrow: number;
  revenue_paid_out: number;
  blog_published: number;
  blog_drafts: number;
  institutions: number;
  referrals: number;
  reviews_pending: number;
  support_open: number;
  escrow_disputed: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiFetch<AdminStats>("/admin/stats");
  return res.data;
}

// --- Blog CMS ---

export type BlogStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: BlogStatus;
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
};

export type BlogDraftInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  status: BlogStatus;
  seo_title?: string;
  seo_description?: string;
  subject_ids?: string[];
  exam_ids?: string[];
};

export async function listAdminPosts(params: {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<Envelope<BlogPost[]>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.page_size ?? 20));
  return apiFetch<BlogPost[]>(`/admin/blog?${qs}`);
}

export async function createAdminPost(input: BlogDraftInput): Promise<BlogPost> {
  const res = await apiFetch<BlogPost>("/admin/blog", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}

export async function updateAdminPost(id: string, input: Partial<BlogDraftInput>): Promise<BlogPost> {
  const res = await apiFetch<BlogPost>(`/admin/blog/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return res.data;
}

export async function setAdminPostStatus(id: string, status: BlogStatus): Promise<void> {
  await apiFetch(`/admin/blog/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

// --- Institutions (B2B) ---

export type Institution = {
  id: string;
  name: string;
  slug: string;
  type: string;
  email?: string;
  phone?: string;
  website?: string;
  is_active: boolean;
  verified_at?: string;
  created_at: string;
};

export async function listInstitutions(params: {
  search?: string;
  type?: string;
  page?: number;
}): Promise<Envelope<Institution[]>> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.type) qs.set("type", params.type);
  qs.set("page", String(params.page ?? 1));
  return apiFetch<Institution[]>(`/admin/institutions?${qs}`);
}

// --- Referrals ---

export type Referral = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code_id: string;
  order_id?: string;
  reward_amount: number;
  status: string;
  created_at: string;
};

export async function listReferrals(params: { status?: string; page?: number }): Promise<Envelope<Referral[]>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  return apiFetch<Referral[]>(`/admin/referrals?${qs}`);
}

// --- Reviews (moderation) ---

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "FLAGGED";

export type ReviewRow = {
  id: string;
  reviewer_user_id: string;
  tutor_profile_id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: ReviewStatus;
  is_public: boolean;
  consent_given: boolean;
  created_at: string;
};

export async function listReviews(params: { status?: string; page?: number }): Promise<Envelope<ReviewRow[]>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  return apiFetch<ReviewRow[]>(`/admin/reviews?${qs}`);
}

export async function moderateReview(id: string, status: ReviewStatus): Promise<void> {
  await apiFetch(`/admin/reviews/${id}/moderate`, { method: "POST", body: JSON.stringify({ status }) });
}

// --- Portal admin (Phase 11b) ---

export type AdminStats2 = AdminStats & {
  lessons_this_week: number;
  lessons_today: number;
  cohorts_published: number;
  pending_enrolments: number;
  overdue_lesson_notes: number;
  pending_refunds: number;
};

export async function getAdminStats2(): Promise<AdminStats2> {
  const res = await apiFetch<AdminStats2>("/admin/stats/overview2");
  return res.data;
}

export type SupportTicket = {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

export async function listSupportTickets(params: { status?: string; page?: number }): Promise<Envelope<SupportTicket[]>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  return apiFetch<SupportTicket[]>(`/admin/support?${qs}`);
}

export async function setSupportStatus(id: string, status: string): Promise<void> {
  await apiFetch(`/admin/support/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

export type AdminCohort = {
  id: string;
  title: string;
  slug: string;
  programme_id: string;
  capacity: number;
  enrolled_count: number;
  start_date: string;
  end_date: string;
  timezone: string;
  fee: number;
  currency: string;
  status: string;
};

export async function listAdminCohorts(params: { status?: string; page?: number }): Promise<Envelope<AdminCohort[]>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  return apiFetch<AdminCohort[]>(`/admin/cohorts?${qs}`);
}

export async function createAdminCohort(input: Record<string, unknown>): Promise<AdminCohort> {
  const res = await apiFetch<AdminCohort>("/admin/cohorts", { method: "POST", body: JSON.stringify(input) });
  return res.data;
}

export async function setAdminCohortStatus(id: string, status: string): Promise<void> {
  await apiFetch(`/admin/cohorts/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

export type AdminLesson = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: string;
  cohort_id?: string;
};

export async function listLessonsToday(): Promise<AdminLesson[]> {
  const res = await apiFetch<AdminLesson[]>("/admin/lessons/today");
  return res.data ?? [];
}

export async function confirmManualPayment(orderId: string, note?: string): Promise<void> {
  await apiFetch(`/admin/orders/${orderId}/confirm-payment`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
