import { apiFetch } from "@/lib/api";
import type { Envelope } from "@/lib/api";

export type ConversationType = "BOOKING" | "COHORT" | "SUPPORT" | "DIRECT";
export type MessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";

export type Conversation = {
  id: string;
  type: ConversationType;
  booking_id?: string;
  cohort_id?: string;
  subject?: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  other_user_id?: string;
  other_user_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  type: MessageType;
  body: string;
  is_edited: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
};

const authHeaders = (userId: string, roles = ["STUDENT"]) => ({
  "X-User-ID": userId,
  "X-User-Roles": roles.join(","),
});

export async function listConversations(userId: string, page = 1): Promise<Envelope<Conversation[]>> {
  return apiFetch<Conversation[]>(`/me/conversations?page=${page}`, { headers: authHeaders(userId) });
}

export async function createBookingConversation(
  userId: string,
  packageId: string,
  participantUserIds: string[]
): Promise<Conversation> {
  const res = await apiFetch<Conversation>("/me/conversations", {
    method: "POST",
    headers: authHeaders(userId, ["TUTOR"]),
    body: JSON.stringify({ type: "BOOKING", package_id: packageId, participant_user_ids: participantUserIds }),
  });
  return res.data;
}

export async function listMessages(userId: string, conversationId: string, limit = 50): Promise<Message[]> {
  const res = await apiFetch<Message[]>(`/me/conversations/${conversationId}/messages?limit=${limit}`, {
    headers: authHeaders(userId),
  });
  return res.data;
}

export async function sendMessage(userId: string, conversationId: string, body: string): Promise<Message> {
  const res = await apiFetch<Message>(`/me/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(userId),
    body: JSON.stringify({ type: "TEXT", body }),
  });
  return res.data;
}

export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  await apiFetch(`/me/conversations/${conversationId}/read`, {
    method: "POST",
    headers: authHeaders(userId),
  });
}

export async function listNotifications(userId: string, page = 1): Promise<Envelope<Notification[]>> {
  return apiFetch<Notification[]>(`/me/notifications?page=${page}`, { headers: authHeaders(userId) });
}

export async function unreadCount(userId: string): Promise<number> {
  const res = await apiFetch<{ unread: number }>("/me/notifications/unread-count", { headers: authHeaders(userId) });
  return res.data.unread;
}

export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await apiFetch(`/me/notifications/${id}/read`, { method: "POST", headers: authHeaders(userId) });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await apiFetch("/me/notifications/read-all", { method: "POST", headers: authHeaders(userId) });
}
