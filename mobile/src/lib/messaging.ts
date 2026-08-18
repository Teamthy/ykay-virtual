import { apiFetch } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Messaging — booking/cohort-scoped conversations (GET /me/conversations).
// Same backend shapes the tutor screens use; this module is role-agnostic so
// parents, students and tutors all read their own threads.
//
// Offline-first: conversations and messages are cached to AsyncStorage and
// served as stale fallback when the network fails, so recent chats stay
// readable offline. Sends are best-effort with an optimistic append.

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

const CONV_KEY = "msg:conversations";
const msgKey = (id: string) => `msg:thread:${id}`;

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

export async function getConversations(): Promise<ConversationItem[]> {
  try {
    const res = await apiFetch<ConversationItem[]>("/me/conversations");
    const list = res.data ?? [];
    writeCache(CONV_KEY, list).catch(() => {});
    return list;
  } catch {
    return (await readCache<ConversationItem[]>(CONV_KEY)) ?? [];
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const key = msgKey(conversationId);
  try {
    const res = await apiFetch<Message[]>(`/me/conversations/${conversationId}/messages`);
    const list = res.data ?? [];
    writeCache(key, list).catch(() => {});
    return list;
  } catch {
    return (await readCache<Message[]>(key)) ?? [];
  }
}

export async function sendMessage(conversationId: string, body: string): Promise<Message | null> {
  try {
    const msg = await apiFetch<Message>(`/me/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }).then((r) => r.data);
    // Optimistically refresh the cached thread with the new message.
    const existing = await readCache<Message[]>(msgKey(conversationId));
    if (existing) {
      writeCache(msgKey(conversationId), [msg, ...existing]).catch(() => {});
    }
    return msg;
  } catch {
    return null; // caller can surface an error
  }
}
