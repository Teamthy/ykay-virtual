import { apiFetch, Envelope } from "@/lib/api";
import type { Order } from "@/features/bookings/types";

// Admin console API - all endpoints require the session cookie with an
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
  tutor_profile_id?: string | null;
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

// --- Cohort tutor assignment ----------------------------------------------

export type AdminVettingProfile = {
  id: string;
  slug: string;
  display_name: string;
  status: string;
  is_public?: boolean;
};

/** Approved tutors, used as the pick-list when assigning a tutor to a cohort. */
export async function listApprovedTutors(pageSize = 200): Promise<AdminVettingProfile[]> {
  const res = await apiFetch<AdminVettingProfile[]>(`/admin/vetting/queue?status=APPROVED&page_size=${pageSize}`);
  return res.data ?? [];
}

/** Assign a tutor to teach a cohort. Pass "" to clear the assignment. */
export async function assignAdminCohortTutor(cohortId: string, tutorProfileId: string): Promise<void> {
  await apiFetch(`/admin/cohorts/${cohortId}/tutor`, { method: "POST", body: JSON.stringify({ tutor_profile_id: tutorProfileId }) });
}

/** Toggle an approved tutor's public marketplace visibility (is_public). */
export async function setTutorPublic(profileId: string, isPublic: boolean): Promise<void> {
  await apiFetch(`/admin/vetting/profiles/${profileId}/public`, { method: "POST", body: JSON.stringify({ is_public: isPublic }) });
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

// Admin payments console (P1).

export type AdminPayout = {
  id: string;
  tutor_profile_id: string;
  escrow_hold_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at?: string;
};

export async function listAdminOrders(page = 1, pageSize = 25): Promise<{ orders: Order[]; total: number }> {
  const res = await apiFetch<Order[]>(`/admin/orders?page=${page}&page_size=${pageSize}`);
  return { orders: res.data ?? [], total: res.meta?.total_items ?? 0 };
}

export async function refundOrder(orderId: string, reason: string): Promise<void> {
  await apiFetch(`/admin/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function listAdminPayouts(status?: string): Promise<AdminPayout[]> {
  const res = await apiFetch<AdminPayout[]>(`/admin/payouts${status ? `?status=${status}` : ""}`);
  return res.data ?? [];
}

// --- SUPER_ADMIN user/role management -------------------------------------

export type AdminRole = { id: string; name: string; description?: string | null };

export type AdminUserRow = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  status: string;
  timezone?: string;
  roles: string[];
  email_verified_at?: string | null;
  last_login_at?: string | null;
  onboarded_at?: string | null;
  created_at: string;
};

export async function listAdminUsers(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: AdminUserRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("page_size", String(params.pageSize ?? 50));
  const res = await apiFetch<AdminUserRow[]>(`/admin/users?${qs}`);
  return { users: res.data ?? [], total: res.meta?.total_items ?? 0 };
}

export async function listAdminRoles(): Promise<AdminRole[]> {
  const res = await apiFetch<AdminRole[]>("/admin/users/roles");
  return res.data ?? [];
}

export async function setUserRole(userId: string, role: string, grant: boolean): Promise<void> {
  await apiFetch(`/admin/users/${userId}/role`, { method: "POST", body: JSON.stringify({ role, grant }) });
}

export async function setUserStatus(userId: string, status: string): Promise<void> {
  await apiFetch(`/admin/users/${userId}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

// --- SUPER_ADMIN audit log viewer ----------------------------------------

export type AuditLogRow = {
  id: string;
  actor_user_id?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  before_json?: string | null;
  after_json?: string | null;
  ip_address?: string | null;
  created_at: string;
};

export async function listAuditLogs(params: {
  action?: string;
  target_type?: string;
  limit?: number;
}): Promise<AuditLogRow[]> {
  const qs = new URLSearchParams();
  if (params.action) qs.set("action", params.action);
  if (params.target_type) qs.set("target_type", params.target_type);
  qs.set("limit", String(params.limit ?? 100));
  const res = await apiFetch<AuditLogRow[]>(`/admin/audit?${qs}`);
  return res.data ?? [];
}
