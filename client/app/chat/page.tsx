"use client";

import Link from "next/link";
import { loginWithReturn } from "@/lib/safe-next";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createChatThread,
  listChatThreads,
  listChatMessages,
  sendChatMessage,
  escalateChatThread,
  rateChatThread,
  type ChatMessage,
} from "@/features/chat/api";
import { useSession } from "@/hooks/useSession";

// Full-page AI assistant - threads sidebar + conversation + composer.
// The backend degrades gracefully when no Gemini key is configured.

export default function ChatPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [ratingSaved, setRatingSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const threads = useQuery({
    queryKey: ["chat", "threads"],
    queryFn: listChatThreads,
  });

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  // Auto-open the most recent thread once loaded.
  useEffect(() => {
    if (!activeId && threads.data?.length) setActiveId(threads.data[0].id);
  }, [threads.data, activeId]);

  const messages = useQuery({
    queryKey: ["chat", "messages", activeId],
    queryFn: () => listChatMessages(activeId!),
    enabled: !!activeId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, sending]);

  const newThread = async () => {
    try {
      const t = await createChatThread();
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
      setActiveId(t.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start a chat");
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setInput("");
    setSending(true);
    // Optimistic echo of the user message.
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      thread_id: activeId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<ChatMessage[]>(["chat", "messages", activeId], (old) => [
      ...(old ?? []),
      optimistic,
    ]);
    try {
      const { reply } = await sendChatMessage(activeId, text);
      qc.setQueryData<ChatMessage[]>(["chat", "messages", activeId], (old) => [
        ...(old ?? []).filter((m) => m.id !== optimistic.id),
        { ...optimistic, id: `${optimistic.id}-saved` },
        {
          id: `bot-${Date.now()}`,
          thread_id: activeId,
          role: "assistant",
          content: reply,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      qc.setQueryData<ChatMessage[]>(["chat", "messages", activeId], (old) =>
        (old ?? []).filter((m) => m.id !== optimistic.id),
      );
      toast.error(
        e instanceof Error ? e.message : "Could not send the message",
      );
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    if (!activeId || escalating) return;
    setEscalating(true);
    try {
      await escalateChatThread(activeId, input.trim() || undefined);
      toast.success("Handed to a human - our team will reply here shortly.");
      qc.invalidateQueries({ queryKey: ["chat", "threads"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not escalate");
    } finally {
      setEscalating(false);
    }
  };

  const saveRating = async (score: number) => {
    if (!activeId) return;
    setRating(score);
    try {
      await rateChatThread(activeId, score);
      setRatingSaved(true);
      toast.success("Thanks for your feedback!");
    } catch {
      setRatingSaved(false);
      toast.error("Could not save your rating");
    }
  };

  const activeThread = threads.data?.find((t) => t.id === activeId);
  const escalated = activeThread?.status === "ESCALATED";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col bg-[#FFF7E4] px-4 py-6 lg:px-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-primary-dark">
              YK-Virtual
            </Link>{" "}
            / Assistant
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-[0.02em] text-deep">
            Chat with YK-Virtual ✨
          </h1>
          <p className="text-sm text-ink-500">
            Ask about programmes, cohorts, tutors or fees - or ask for a human
            anytime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void newThread()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-ink-900 hover:bg-primary-hover"
        >
          + New chat
        </button>
      </header>

      <div className="mt-5 grid flex-1 gap-4 lg:grid-cols-[260px_1fr]">
        {/* Threads */}
        <aside className="rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
          {threads.isLoading ? (
            <p className="p-4 text-center text-sm text-ink-400">Loading…</p>
          ) : (threads.data ?? []).length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-400">
              No conversations yet - start a new chat below.
            </p>
          ) : (
            <div className="space-y-1">
              {(threads.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "block w-full rounded-xl px-3 py-2.5 text-left text-sm",
                    activeId === t.id
                      ? "bg-primary-light font-semibold text-deep"
                      : "text-ink-700 hover:bg-ink-50",
                  )}
                >
                  <span className="block truncate">{t.title}</span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px]",
                      escalated && t.id === activeId
                        ? "font-bold text-primary-dark"
                        : "text-ink-400",
                    )}
                  >
                    {t.status === "ESCALATED"
                      ? "👤 With a human agent"
                      : new Date(t.updated_at).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Conversation */}
        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {!activeId ? (
              <div className="grid flex-1 place-items-center text-center">
                <div>
                  <p className="text-4xl">💬</p>
                  <p className="mt-2 font-semibold text-ink-700">
                    Start a conversation
                  </p>
                  <p className="mt-1 text-sm text-ink-500">
                    Ask about programmes, cohorts, tutors or anything
                    YK-Virtual.
                  </p>
                </div>
              </div>
            ) : messages.isLoading ? (
              <p className="py-10 text-center text-sm text-ink-400">
                Loading messages…
              </p>
            ) : (
              <>
                {(messages.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col",
                      m.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    {m.role === "agent" && (
                      <span className="mb-0.5 rounded-full bg-deep px-2 py-0.5 text-[10px] font-bold text-white">
                        SUPPORT AGENT
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-md bg-deep text-white"
                          : m.role === "agent"
                            ? "rounded-bl-md border-2 border-primary bg-white text-ink-800"
                            : "rounded-bl-md border border-ink-100 bg-[#F8EBCF] text-ink-800",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-ink-100 bg-[#F8EBCF] px-4 py-3 text-sm text-ink-400">
                      <span className="inline-flex gap-1">
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400" />
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:120ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="border-t border-ink-100 p-4">
            {activeId &&
              !escalated &&
              (messages.data?.length ?? 0) >= 4 &&
              !ratingSaved && (
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-2.5">
                  <span className="text-xs font-semibold text-ink-600">
                    Rate this chat:
                  </span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => void saveRating(n)}
                      className={cn(
                        "text-lg transition-transform hover:scale-125",
                        rating !== null && rating >= n
                          ? ""
                          : "grayscale opacity-50",
                      )}
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              )}
            {escalated && (
              <p className="mb-3 rounded-xl bg-primary-light px-4 py-2.5 text-xs font-semibold text-deep">
                👤 A human agent is on this thread - they&apos;ll reply here.
                You can keep messaging.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void escalate()}
                disabled={!activeId || escalating}
                className="shrink-0 rounded-lg border border-ink-200 px-3 py-2.5 text-sm font-semibold text-ink-600 hover:border-ink-300 disabled:opacity-40"
                title="Hand over to a human agent"
              >
                👤 Human
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                placeholder={
                  activeId ? "Type your message…" : "Start a new chat first"
                }
                disabled={!activeId || sending}
                className="h-11 flex-1 rounded-lg border border-ink-200 px-4 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || !activeId || sending}
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-primary-hover disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
