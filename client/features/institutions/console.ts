"use client";

import { apiFetch } from "@/lib/api";

export type InstitutionType = "SCHOOL" | "CORPORATE" | "GOVERNMENT" | "NGO" | "OTHER";
export type MembershipRole = "OWNER" | "ADMIN" | "TEACHER" | "STUDENT" | "BILLING";

export type Institution = {
  id: string;
  name: string;
  slug: string;
  type: InstitutionType;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
  description?: string | null;
  verified_at?: string | null;
  is_active: boolean;
  created_at: string;
};

export type Membership = {
  id: string;
  institution_id: string;
  user_id: string;
  role: MembershipRole;
  joined_at?: string | null;
  created_at: string;
};

export type MembershipView = {
  institution: Institution;
  role: MembershipRole;
  id: string;
  institution_id: string;
  user_id: string;
  joined_at?: string | null;
};

export type InstitutionStudent = {
  id: string;
  institution_id: string;
  student_profile_id: string;
  enrollment_ref?: string | null;
  created_at: string;
  student_name: string;
  student_level?: string | null;
};

export type InstitutionUpdateInput = {
  name?: string;
  type?: InstitutionType;
  email?: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  description?: string;
};

export async function listMyInstitutions(): Promise<MembershipView[]> {
  const res = await apiFetch<MembershipView[]>("/me/institutions");
  return res.data ?? [];
}

export async function getInstitution(id: string): Promise<Institution> {
  const res = await apiFetch<Institution>(`/me/institutions/${id}`);
  return res.data;
}

export async function updateInstitution(id: string, input: InstitutionUpdateInput): Promise<Institution> {
  const res = await apiFetch<Institution>(`/me/institutions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function listMemberships(id: string): Promise<Membership[]> {
  const res = await apiFetch<Membership[]>(`/me/institutions/${id}/memberships`);
  return res.data ?? [];
}

export async function inviteMember(id: string, userId: string, role: MembershipRole): Promise<Membership> {
  const res = await apiFetch<Membership>(`/me/institutions/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
  return res.data;
}

export async function setMemberRole(id: string, userId: string, role: MembershipRole): Promise<void> {
  await apiFetch(`/me/institutions/${id}/members/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(id: string, userId: string): Promise<void> {
  await apiFetch(`/me/institutions/${id}/members/${userId}`, { method: "DELETE" });
}

export async function listStudents(id: string): Promise<InstitutionStudent[]> {
  const res = await apiFetch<InstitutionStudent[]>(`/me/institutions/${id}/students`);
  return res.data ?? [];
}

export async function addStudent(id: string, studentProfileId: string, enrollmentRef?: string): Promise<InstitutionStudent> {
  const res = await apiFetch<InstitutionStudent>(`/me/institutions/${id}/students`, {
    method: "POST",
    body: JSON.stringify({ student_profile_id: studentProfileId, enrollment_ref: enrollmentRef || "" }),
  });
  return res.data;
}

export async function removeStudent(id: string, studentProfileId: string): Promise<void> {
  await apiFetch(`/me/institutions/${id}/students/${studentProfileId}`, { method: "DELETE" });
}
