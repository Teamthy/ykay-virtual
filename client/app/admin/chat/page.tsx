"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listAllChatThreads,
  getChatAnalytics,
  listChatMessages,
  agentReply,
  closeChatThread,
  type ChatThread,
} from "@/features/chat/api";
import { useSession } from "@/hooks/useSession";

// Agent inbox (C4–C6) — escalated chat threads with transcripts, reply as a
// human agent, close, and analytics. Admin-only.

export default function AdminChatPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, isLoading } = useSession();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const threads = useQuery({ queryKey: ["admin", "chat", "threads"], queryFn: listAllChatThreads });
  const analytics = useQuery({ queryKey: ["admin", "chat", "analytics"], queryFn: getChatAnalytics });

  useEffect(() => {
    if (!activeId && threads.data?.length) setActiveId(threads.data[0].id);
  }, [threads.data, activeId]);

  const messages = useQuery({
    queryKey: ["admin", "chat", "messages", activeId],
    queryFn: () => listChatMessages(activeId!),
    enabled: !!activeId,
  });

  const reply = useMutation({
    mutationFn: () => agentReply(activeId!, replyText),
    onSuccess: () => {
      setReplyText("");
      toast.success("Reply sent to the user");
      qc.invalidateQueries({ queryKey: ["admin", "chat", "messages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send reply"),
  });

  const close = useMutation({
    mutationFn: () => closeChatThread(activeId!),
    onSuccess: () => {
      toast.success("Conversation closed");
      qc.invalidateQueries({ queryKey: ["admin", "chat"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not close"),
  });

  const activeThread: ChatThread | undefined = threads.data?.find((t) => t.id === activeId);
  const escalatedCount = (threads.data ?? []).filter((t) => t.status === "ESCALATED").length;

  const stats = [
    { label: "Total threads", value: analytics.data?.total_threads ?? "—" },
    { label: "Escalated", value: analytics.data?.escalated_threads ?? "—" },
    { label: "Closed", value: analytics.data?.closed_threads ?? "—" },
    { label: "Avg rating", value: analytics.data?.avg_rating ? `★ ${analytics.data.avg_rating.toFixed(1)}` : "—" },
    { label: "CSAT (4★+)", value: analytics.data ? `${Math.round(analytics.data.csat)}%` : "—" },
    { label: "Deflection", value: analytics.data ? `${Math.round(analytics.data.deflection_rate * 100)}%` : "—" },
    { label: "Messages", value: analytics.data?.total_messages ?? "—" },
  ];

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#FFFCF5] px-4 py-6 lg:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
          <Link href="/admin" className="hover:text-brand-gold-dark">Admin</Link> / Chat inbox
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-[0.02em] text-brand-navy">
          Agent inbox <span className="align-middle text-sm font-semibold text-ink-400">· {escalatedCount} waiting</span>
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          CSAT:{" "}
          <span className="font-bold text-brand-navy">{analytics.data ? `${Math.round(analytics.data.csat)}%` : "—"}</span>{" "}
          satisfied ({analytics.data?.csat_responded ?? 0}/{analytics.data?.csat_total ?? 0} rated) ·{" "}
          <a href="/api/v1/admin/chat/csat.csv" className="font-semibold text-brand-gold-dark hover:underline">export CSV ↓</a>
        </p>
      </header>

      {/* Analytics */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
            <p className="text-xl font-extrabold text-brand-navy">{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Thread list */}
        <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-3 shadow-sm">
          {threads.isLoading ? (
            <p className="p-4 text-center text-sm text-ink-400">Loading…</p>
          ) : (threads.data ?? []).length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-400">No chat threads yet.</p>
          ) : (
            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
              {(threads.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "block w-full rounded-xl px-3 py-2.5 text-left text-sm",
                    activeId === t.id ? "bg-brand-gold-light font-semibold text-brand-navy" : "text-ink-700 hover:bg-ink-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{t.title}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        t.status === "ESCALATED"
                          ? "bg-red-100 text-red-600"
                          : t.status === "CLOSED"
                          ? "bg-ink-100 text-ink-500"
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {t.status}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-400">
                    {t.user_id.slice(0, 8)}… · {new Date(t.updated_at).toLocaleString()}
                    {t.rating ? ` · ★${t.rating}${t.rating_comment ? " — " + t.rating_comment.slice(0, 24) : ""}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Transcript + reply */}
        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-ink-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <div>
              <p className="text-sm font-bold text-brand-navy">{activeThread?.title ?? "Select a thread"}</p>
              <p className="text-xs text-ink-400">Thread {activeId ? activeId.slice(0, 8) : ""}…</p>
            </div>
            {activeThread && activeThread.status !== "CLOSED" && (
              <button
                type="button"
                disabled={close.isPending}
                onClick={() => close.mutate()}
                className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-600 hover:border-ink-300 disabled:opacity-40"
              >
                Close conversation
              </button>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {!activeId ? (
              <p className="grid flex-1 place-items-center text-center text-sm text-ink-400">Select a thread from the inbox.</p>
            ) : messages.isLoading ? (
              <p className="py-10 text-center text-sm text-ink-400">Loading transcript…</p>
            ) : (
              <>
                {(messages.data ?? []).map((m) => (
                  <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                    <span
                      className={cn(
                        "mb-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        m.role === "user"
                          ? "bg-ink-100 text-ink-500"
                          : m.role === "agent"
                          ? "bg-brand-gold text-ink-900"
                          : "bg-brand-gold-light text-brand-navy"
                      )}
                    >
                      {m.role === "user" ? "STUDENT" : m.role === "agent" ? "YOU (AGENT)" : "NUVORA AI"}
                    </span>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-md bg-brand-navy text-white"
                          : m.role === "agent"
                          ? "rounded-bl-md border-2 border-brand-gold bg-white text-ink-800"
                          : "rounded-bl-md bg-[#FFF8E8] text-ink-800"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {activeThread && activeThread.status !== "CLOSED" && (
            <div className="border-t border-ink-100 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && replyText.trim() && void reply.mutate()}
                  placeholder="Reply as a human agent…"
                  className="h-11 flex-1 rounded-lg border border-ink-200 px-4 text-sm focus:border-brand-gold focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!replyText.trim() || reply.isPending}
                  onClick={() => reply.mutate()}
                  className="shrink-0 rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
                >
                  {reply.isPending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
