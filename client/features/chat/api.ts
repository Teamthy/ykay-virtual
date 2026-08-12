import { apiFetch } from "@/lib/api";

// AI assistant + human handoff (phase 33).

export type ChatThread = {
  id: string;
  user_id: string;
  title: string;
  status: "OPEN" | "ESCALATED" | "CLOSED";
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export async function createChatThread(title?: string): Promise<ChatThread> {
  const res = await apiFetch<ChatThread>("/chat/threads", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return res.data;
}

export async function listChatThreads(): Promise<ChatThread[]> {
  const res = await apiFetch<ChatThread[]>("/chat/threads");
  return res.data ?? [];
}

export async function listChatMessages(threadId: string): Promise<ChatMessage[]> {
  const res = await apiFetch<ChatMessage[]>(`/chat/threads/${threadId}/messages`);
  return res.data ?? [];
}

export async function sendChatMessage(
  threadId: string,
  content: string
): Promise<{ reply: string; status: string }> {
  const res = await apiFetch<{ reply: string; status: string }>(`/chat/threads/${threadId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function escalateChatThread(threadId: string, note?: string): Promise<void> {
  await apiFetch(`/chat/threads/${threadId}/escalate`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}
