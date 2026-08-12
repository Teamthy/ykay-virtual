import { apiFetch } from "@/lib/api";

// AI assistant + human handoff (phase 33).

export type ChatThread = {
  id: string;
  user_id: string;
  title: string;
  status: "OPEN" | "ESCALATED" | "CLOSED";
  rating?: number;
  rating_comment?: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "agent" | "system";
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

// --- C4–C6: ratings + agent inbox ---

export type ChatAnalytics = {
  total_threads: number;
  open_threads: number;
  escalated_threads: number;
  closed_threads: number;
  total_messages: number;
  avg_rating: number;
  rated_threads: number;
  csat: number;
  csat_responded: number;
  csat_total: number;
  escalation_rate: number;
  deflection_rate: number;
};

export async function rateChatThread(threadId: string, score: number, comment?: string): Promise<void> {
  await apiFetch(`/chat/threads/${threadId}/rating`, {
    method: "POST",
    body: JSON.stringify({ score, comment }),
  });
}

export async function listAllChatThreads(): Promise<ChatThread[]> {
  const res = await apiFetch<ChatThread[]>("/admin/chat/threads");
  return res.data ?? [];
}

export async function getChatAnalytics(): Promise<ChatAnalytics> {
  const res = await apiFetch<ChatAnalytics>("/admin/chat/analytics");
  return res.data;
}

export async function agentReply(threadId: string, content: string): Promise<ChatMessage> {
  const res = await apiFetch<ChatMessage>(`/admin/chat/threads/${threadId}/reply`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function closeChatThread(threadId: string): Promise<void> {
  await apiFetch(`/admin/chat/threads/${threadId}/close`, { method: "POST" });
}

export type ChatTrendPoint = {
  date: string;
  threads: number;
  escalated: number;
  rated: number;
  avg_rating: number;
  csat: number;
};

export async function getChatTrends(days = 14): Promise<ChatTrendPoint[]> {
  const res = await apiFetch<ChatTrendPoint[]>(`/admin/chat/analytics/trends?days=${days}`);
  return res.data ?? [];
}
