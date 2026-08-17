import { apiFetch } from "./api";

// Messaging — booking/cohort-scoped conversations (GET /me/conversations).
// Same backend shapes the tutor screens use; this module is role-agnostic so
// parents, students and tutors all read their own threads.

export type ConversationItem = {
  id: string;
  type: string;
  booking_id?: string | null;
  cohort_id?: string | null;
  subject?: string | null;
  is_closed: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  other_user_id?: string | null;
  other_user_name?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  type: string;
  body: string;
  metadata?: string | null;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
};

export function getConversations(): Promise<ConversationItem[]> {
  return apiFetch<ConversationItem[]>("/me/conversations").then((r) => r.data ?? []);
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return apiFetch<Message[]>(`/me/conversations/${conversationId}/messages`).then((r) => r.data ?? []);
}

export function sendMessage(conversationId: string, body: string): Promise<Message> {
  return apiFetch<Message>(`/me/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  }).then((r) => r.data);
}
