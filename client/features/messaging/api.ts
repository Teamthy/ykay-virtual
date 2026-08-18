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

// G1 (phase 43): the actor is resolved server-side from the httpOnly session
// cookie - the retired X-User-ID/X-User-Roles bridge headers are gone.

export async function listConversations(page = 1): Promise<Envelope<Conversation[]>> {
  return apiFetch<Conversation[]>(`/me/conversations?page=${page}`);
}

export async function createBookingConversation(
  packageId: string,
  participantUserIds: string[]
): Promise<Conversation> {
  const res = await apiFetch<Conversation>("/me/conversations", {
    method: "POST",
    body: JSON.stringify({ type: "BOOKING", package_id: packageId, participant_user_ids: participantUserIds }),
  });
  return res.data;
}

export async function listMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const res = await apiFetch<Message[]>(`/me/conversations/${conversationId}/messages?limit=${limit}`);
  return res.data;
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const res = await apiFetch<Message>(`/me/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ type: "TEXT", body }),
  });
  return res.data;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await apiFetch(`/me/conversations/${conversationId}/read`, {
    method: "POST",
  });
}

export async function listNotifications(page = 1): Promise<Envelope<Notification[]>> {
  return apiFetch<Notification[]>(`/me/notifications?page=${page}`);
}

export async function unreadCount(): Promise<number> {
  const res = await apiFetch<{ unread: number }>("/me/notifications/unread-count");
  return res.data?.unread ?? 0; // null-safe: fresh accounts receive data:null
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/me/notifications/${id}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/me/notifications/read-all", { method: "POST" });
}
