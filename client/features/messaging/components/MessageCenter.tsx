"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
  listConversationContacts,
  startCohortConversation,
  type ConversationContact,
} from "@/features/messaging/api";
import type { Conversation, Message } from "@/features/messaging/api";
import { useSession } from "@/hooks/useSession";

// G1: the acting user comes from the session - the API scopes conversations
// to the authenticated cookie; no fixture user IDs.
export function MessageCenter() {
  const { user } = useSession();
  const currentUserId = user?.id ?? "";
  const isTutor = (user?.roles ?? []).includes("TUTOR");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [contacts, setContacts] = useState<ConversationContact[] | null>(null);
  const [contactBusy, setContactBusy] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  const conversations = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => listConversations(),
    enabled: !!currentUserId,
    staleTime: 30_000,
    refetchInterval: 15_000, // dev polling; Redis pub/sub in prod
  });

  const messages = useQuery({
    queryKey: ["messages", selected],
    queryFn: () => (selected ? listMessages(selected) : Promise.resolve([])),
    enabled: !!selected,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  // Envelope-normalised data (apiFetch returns {data, meta}; a fresh account
  // can receive `data: null` from the API - never deref without a default).
  // listConversations keeps the envelope; listMessages already unwraps.
  const conversationList: Conversation[] = conversations.data?.data ?? [];
  const messageList: Message[] = messages.data ?? [];

  // Mark read when opening a conversation.
  useEffect(() => {
    if (selected) void markConversationRead(selected);
  }, [selected, messageList.length]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList.length]);

  const qc = useQueryClient();
  const send = useMutation({
    mutationFn: (body: string) => sendMessage(selected!, body),
    onMutate: async (body) => {
      if (!selected) return;
      // Optimistic insert (AGENTS.md: optimistic updates for messaging).
      await qc.cancelQueries({ queryKey: ["messages", selected] });
      const prev = qc.getQueryData<Message[]>(["messages", selected]) ?? [];
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: selected,
        sender_user_id: currentUserId,
        type: "TEXT",
        body,
        is_edited: false,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData(["messages", selected], [optimistic, ...prev]);
      setDraft("");
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["messages", selected], ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["messages", selected] });
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const submit = () => {
    if (draft.trim() && selected) send.mutate(draft.trim());
  };

  const openContacts = async () => {
    setContacts([]);
    try {
      const list = await listConversationContacts();
      setContacts(list);
    } catch {
      setContacts([]);
    }
  };

  const startWith = async (c: ConversationContact) => {
    if (!c.cohort_id) return;
    setContactBusy(c.user_id);
    try {
      const conv = await startCohortConversation(c.cohort_id);
      setSelected(conv.id);
      setContacts(null);
      void qc.invalidateQueries({ queryKey: ["conversations"] });
    } catch {
      /* surfaced via empty contacts */
    } finally {
      setContactBusy(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-[340px_1fr] border rounded-2xl overflow-hidden h-[70vh]">
      {/* Conversation list */}
      <aside className="border-r border-ink-100 overflow-y-auto bg-ink-50/50">
        <div className="p-4 border-b border-ink-100">
          <h2 className="font-bold">Messages</h2>
          <p className="text-xs text-ink-500 mt-1">Booking-scoped conversations</p>
        </div>
        {conversations.isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : conversationList.length === 0 ? (
          <div className="space-y-3 p-4">
            <p className="text-sm text-ink-500">
              {isTutor
                ? "No conversations yet — they start when a learner enrols in your cohort, or you message one below."
                : "No conversations yet. Message your tutor to start one — they appear as soon as you're enrolled."}
            </p>
            <button
              type="button"
              onClick={() => void openContacts()}
              className="w-full rounded-xl border border-brand-gold bg-brand-gold-light px-4 py-2.5 text-sm font-bold text-brand-gold-dark hover:bg-brand-gold hover:text-ink-900"
            >
              {isTutor ? "Message your learners" : "Message your tutor"}
            </button>
            {contacts !== null && (
              <div className="space-y-2">
                {contacts.length === 0 ? (
                  <p className="text-xs text-ink-400">
                    {isTutor
                      ? "No confirmed learners in your cohorts yet."
                      : "No tutor on your enrolments yet — book a class first."}
                  </p>
                ) : (
                  contacts.map((c) => (
                    <button
                      key={`${c.user_id}-${c.cohort_id}`}
                      type="button"
                      disabled={contactBusy === c.user_id}
                      onClick={() => void startWith(c)}
                      className="flex w-full items-center justify-between gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-left text-sm hover:border-ink-200 disabled:opacity-50"
                    >
                      <span>
                        <span className="block font-semibold text-ink-800">{c.name}</span>
                        <span className="block text-[11px] text-ink-400">
                          {c.role.toLowerCase()} · {c.cohort_title ?? "class"}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-brand-gold-dark">Start →</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <ul>
            {conversationList.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-ink-100 transition-colors ${
                    selected === c.id ? "bg-white shadow-sm" : "hover:bg-white/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">
                      {c.other_user_name ?? c.type.toLowerCase()}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-blue px-1.5 text-[10px] font-bold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-500 truncate mt-0.5">{c.last_message ?? c.subject ?? ""}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Thread */}
      <section className="flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 grid place-items-center text-sm text-ink-400">
            Select a conversation to view messages
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.isLoading ? (
                <Skeleton className="h-16 w-2/3" />
              ) : messageList.length === 0 ? (
                <p className="text-sm text-ink-400 text-center pt-10">No messages yet - say hello!</p>
              ) : (
                [...messageList].reverse().map((m) => {
                  const mine = m.sender_user_id === currentUserId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          mine ? "bg-brand-blue text-white rounded-br-md" : "bg-ink-100 text-ink-800 rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-ink-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={listEndRef} />
            </div>
            <div className="border-t border-ink-100 p-3 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
              <Button size="sm" onClick={submit} disabled={!draft.trim() || send.isPending}>
                Send
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
