import { apiFetch } from "@/lib/api";

// Leads — conversion follow-up funnel. Visitors who browse but don't enroll
// can leave their contact details; the ops team follows up on WhatsApp.

export type Lead = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  source: string;
  intent: string;
  programme_id?: string | null;
  cohort_id?: string | null;
  message?: string | null;
  status: "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
  contacted_at?: string | null;
  converted_at?: string | null;
  created_at: string;
};

export type LeadCounts = {
  NEW: number;
  CONTACTED: number;
  CONVERTED: number;
  CLOSED: number;
};

export type CaptureLeadInput = {
  name: string;
  email?: string;
  phone: string;
  source: string;
  intent?: "CALLBACK_REQUEST" | "GENERAL_INTEREST";
  message?: string;
  cohort_id?: string;
  programme_id?: string;
};

export async function captureLead(
  input: CaptureLeadInput
): Promise<{ received: boolean; id: string }> {
  const res = await apiFetch<{ received: boolean; id: string }>("/leads", {
    method: "POST",
    body: JSON.stringify({ ...input, website: "" }),
  });
  return res.data;
}

export async function listLeads(params: {
  status?: string;
  page?: number;
}): Promise<{ leads: Lead[]; counts: LeadCounts; meta?: { total_items: number; page: number; page_size: number } }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  const res = await apiFetch<{ leads: Lead[]; counts: LeadCounts }>(`/admin/leads?${qs}`);
  return { ...res.data, meta: res.meta };
}

export async function updateLeadStatus(id: string, status: Lead["status"]): Promise<Lead> {
  const res = await apiFetch<Lead>(`/admin/leads/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
  return res.data;
}

export function leadWhatsAppHref(lead: Lead): string | null {
  let digits = (lead.phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  // Normalise local Nigerian formats (0XXX…) to international; anything
  // already international is kept as-is.
  if (digits.startsWith("0")) digits = "234" + digits.slice(1);
  return `https://wa.me/${digits}`;
}
