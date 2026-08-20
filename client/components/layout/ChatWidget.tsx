"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, Home, MessageSquare, Search, Send, Star, X } from "lucide-react";
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
import { loginWithReturn } from "@/lib/safe-next";
import { getHelpArticles, type HelpArticle } from "@/lib/help-data";
import { answerFromKnowledge } from "@/lib/chat-kb";

type Tab = "home" | "conversation" | "kb";
type Bubble = { id: string; role: string; content: string };

const SUGGESTED = [
  "How do I access my course materials?",
  "When is my next assignment due?",
  "How do I join a live lesson?",
  "What's my current progress?",
];

export function ChatWidget() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [kbQuery, setKbQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [guestMsgs, setGuestMsgs] = useState<Bubble[]>([]);
  const [escalated, setEscalated] = useState(false);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    active: boolean;
    offX: number;
    offY: number;
    moved: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (anchor === null && typeof window !== "undefined") {
      setAnchor({ x: window.innerWidth - 32 - 56, y: window.innerHeight - 32 - 56 });
    }
  }, [anchor]);

  const launcherDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const t = e.currentTarget.getBoundingClientRect();
    drag.current = {
      active: true,
      offX: e.clientX - t.left,
      offY: e.clientY - t.top,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const launcherMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || !d.active || typeof window === "undefined") return;
    if (Math.abs(e.clientX - d.startX) > 4 || Math.abs(e.clientY - d.startY) > 4) d.moved = true;
    if (!d.moved) return;
    const size = 56;
    setAnchor({
      x: Math.min(Math.max(0, e.clientX - d.offX), window.innerWidth - size),
      y: Math.min(Math.max(0, e.clientY - d.offY), window.innerHeight - size),
    });
  };
  const launcherUp = () => {
    const wasMoved = drag.current?.moved ?? false;
    drag.current = null;
    if (!wasMoved) setOpen((v) => !v);
  };

  const threads = useQuery({
    queryKey: ["chat", "widget-threads"],
    queryFn: listChatThreads,
    enabled: !!user && open,
  });

  useEffect(() => {
    if (open && user && !threadId && threads.data?.length) setThreadId(threads.data[0].id);
  }, [open, user, threads.data, threadId]);

  const messages = useQuery({
    queryKey: ["chat", "widget-messages", threadId],
    queryFn: () => listChatMessages(threadId!),
    enabled: !!threadId && open && tab === "conversation" && !!user,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, guestMsgs, sending, open, tab]);

  const articles = useMemo(() => {
    const all = getHelpArticles();
    const q = kbQuery.trim().toLowerCase();
    if (!q) return all.slice(0, 8);
    return all.filter((a) => a.q.toLowerCase().includes(q) || a.a.toLowerCase().includes(q)).slice(0, 12);
  }, [kbQuery]);

  const ensureThread = async () => {
    if (threadId) return threadId;
    const t = await createChatThread("NUVORA guide");
    setThreadId(t.id);
    qc.invalidateQueries({ queryKey: ["chat", "widget-threads"] });
    return t.id;
  };

  const pushGuest = (text: string) => {
    const reply = answerFromKnowledge(text);
    setGuestMsgs((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: text },
      { id: `a-${Date.now()}`, role: "assistant", content: reply },
    ]);
  };

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSendError(null);
    setTab("conversation");
    if (!user) {
      pushGuest(text);
      return;
    }
    setSending(true);
    try {
      const tId = await ensureThread();
      const { reply, status } = await sendChatMessage(tId, text);
      if (status === "ESCALATED") setEscalated(true);
      qc.setQueryData(["chat", "widget-messages", tId], (old: unknown) => {
        const list = (old as ChatMessage[] | undefined) ?? [];
        return [
          ...list,
          { id: `u-${Date.now()}`, thread_id: tId, role: "user", content: text, created_at: new Date().toISOString() },
          { id: `a-${Date.now()}`, thread_id: tId, role: "assistant", content: reply, created_at: new Date().toISOString() },
        ];
      });
      qc.invalidateQueries({ queryKey: ["chat", "widget-messages", tId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send";
      setSendError(msg);
      pushGuest(text);
    } finally {
      setSending(false);
    }
  };

  const askHuman = async () => {
    if (!user) {
      router.push(loginWithReturn());
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const tId = await ensureThread();
      await escalateChatThread(tId, "Widget: talk to a person");
      setEscalated(true);
      qc.invalidateQueries({ queryKey: ["chat", "widget-messages", tId] });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Could not reach support");
    } finally {
      setSending(false);
    }
  };

  const submitRating = async (score: number) => {
    if (!threadId || !user) return;
    setRating(score);
    try {
      await rateChatThread(threadId, score);
      setRated(true);
    } catch {
      setSendError("Could not save rating");
    }
  };

  const liveMsgs: Bubble[] = user
    ? (messages.data ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content }))
    : guestMsgs;
  const showWelcome = liveMsgs.length === 0;

  const launcherStyle: React.CSSProperties = anchor
    ? { position: "fixed", left: anchor.x, top: anchor.y, zIndex: 50 }
    : { position: "fixed", right: 32, bottom: 32, zIndex: 50 };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex h-[min(92vh,560px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-3xl border border-ink-100 bg-ink-50 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between bg-deep px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center overflow-hidden rounded-full bg-brand-gold text-lg font-bold text-ink-900">
                N
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">
                  {tab === "kb" ? "Knowledge Base" : tab === "conversation" ? "Conversation" : "Nuvora"}
                </p>
                <p className="text-[11px] text-white/70">{user ? "Signed in · replies saved" : "Ask anything · no login needed"}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full bg-white/10" aria-label="Close chat">
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-ink-50 p-3">
            {tab === "home" && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setTab("conversation")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-soft"
                >
                  <span className="grid size-12 place-items-center rounded-full bg-brand-gold text-lg font-bold text-ink-900">N</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink-900">Chat with Nuvora</span>
                    <span className="block text-xs text-ink-500">Lessons, payments, accounts — ask now</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-400" />
                </button>

                <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
                  <p className="px-4 pt-3 text-sm font-bold text-ink-900">Articles</p>
                  <ul className="mt-1">
                    {getHelpArticles().slice(0, 3).map((a) => (
                      <li key={a.slug}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFaq(a.q);
                            setTab("kb");
                          }}
                          className="flex w-full items-center justify-between gap-2 border-t border-ink-50 px-4 py-3 text-left text-sm text-ink-800 hover:bg-ink-50"
                        >
                          {a.q}
                          <ChevronRight size={14} className="shrink-0 text-ink-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setTab("kb")} className="w-full border-t border-ink-50 py-3 text-center text-sm font-semibold text-ink-700">
                    View all
                  </button>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-soft">
                  <p className="text-sm font-bold text-ink-900">Previous conversations</p>
                  {!user ? (
                    <p className="mt-3 text-center text-sm text-ink-400">
                      <button type="button" onClick={() => router.push(loginWithReturn())} className="font-semibold text-brand-gold-dark hover:underline">
                        Log in
                      </button>{" "}
                      to keep a history
                    </p>
                  ) : (threads.data ?? []).length === 0 ? (
                    <p className="mt-3 text-center text-sm text-ink-400">No previous conversation</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {(threads.data ?? []).slice(0, 4).map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setThreadId(t.id);
                              setTab("conversation");
                            }}
                            className="w-full truncate rounded-lg px-2 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                          >
                            {t.title || "Conversation"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {tab === "conversation" && (
              <div className="flex min-h-full flex-col">
                <div className="flex-1 space-y-3 pb-3">
                  {showWelcome && (
                    <div className="flex items-start gap-2">
                      <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand-gold text-xs font-bold text-ink-900">N</span>
                      <div className="rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-800 shadow-sm">
                        Hi, I&apos;m Nuvora. I help with courses, assignments, payments and what to do next. What can I help with?
                      </div>
                    </div>
                  )}
                  {liveMsgs.map((m) => (
                    <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "items-start gap-2")}>
                      {m.role !== "user" && (
                        <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-brand-gold text-xs font-bold text-ink-900">N</span>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                          m.role === "user" ? "rounded-br-md bg-deep text-white" : "rounded-tl-md bg-white text-ink-800 shadow-sm"
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && <p className="pl-9 text-xs text-ink-400">Nuvora is typing…</p>}
                  {sendError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{sendError}</p>}
                  {escalated && (
                    <p className="rounded-xl bg-brand-gold-light px-3 py-2 text-xs font-semibold text-deep">
                      A human on the NUVORA team will pick this up. Watch your inbox and Notifications.
                    </p>
                  )}
                  {showWelcome && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-ink-500">Suggested questions</p>
                      <div className="space-y-2">
                        {SUGGESTED.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => void send(s)}
                            className="w-full rounded-full border border-ink-200 bg-white px-4 py-2.5 text-left text-sm text-ink-800 hover:border-brand-gold"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {user && liveMsgs.length >= 2 && !rated && (
                    <div className="rounded-2xl bg-white px-3 py-2.5 shadow-sm">
                      <p className="text-[11px] font-semibold text-ink-500">Was this helpful?</p>
                      <div className="mt-1 flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => void submitRating(n)}
                            className="p-1 text-ink-300 hover:text-brand-gold"
                            aria-label={`${n} stars`}
                          >
                            <Star size={16} fill={rating >= n ? "currentColor" : "none"} className={rating >= n ? "text-brand-gold" : ""} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {rated && <p className="text-center text-[11px] text-ink-400">Thanks for the rating.</p>}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}

            {tab === "kb" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={kbQuery}
                    onChange={(e) => setKbQuery(e.target.value)}
                    placeholder="Search articles"
                    className="h-10 w-full rounded-full border border-ink-200 bg-white pl-9 pr-3 text-sm text-ink-900"
                  />
                </div>
                <p className="text-sm font-bold text-ink-900">Frequently asked</p>
                <div className="space-y-2">
                  {articles.map((a: HelpArticle) => (
                    <details
                      key={a.slug}
                      open={openFaq === a.q}
                      onToggle={(e) => setOpenFaq((e.target as HTMLDetailsElement).open ? a.q : null)}
                      className="rounded-2xl bg-white p-3 shadow-soft"
                    >
                      <summary className="cursor-pointer list-none">
                        <span className="inline-block rounded-md bg-brand-gold-light px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-deep">
                          {a.category.title}
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-ink-900">{a.q}</span>
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">{a.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>

          {tab === "conversation" && (
            <div className="border-t border-ink-100 bg-white p-3">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => void askHuman()}
                  disabled={sending || escalated}
                  className="text-[11px] font-bold text-brand-gold-dark hover:underline disabled:opacity-40"
                >
                  Talk to a person
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void send()}
                  placeholder="Ask Nuvora anything…"
                  className="h-11 flex-1 rounded-full border border-ink-200 px-4 text-sm text-ink-900"
                />
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={!input.trim() || sending}
                  className="grid size-11 place-items-center rounded-2xl bg-deep text-white disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-ink-400">
                Nuvora can be wrong — check fees and dates on the page.
              </p>
            </div>
          )}

          <nav className="grid grid-cols-3 border-t border-ink-100 bg-white">
            {(
              [
                ["home", "Home", Home],
                ["conversation", "Conversation", MessageSquare],
                ["kb", "Knowledge Base", BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold",
                  tab === id ? "text-deep" : "text-ink-400"
                )}
              >
                <Icon size={18} />
                {label}
                {tab === id && <span className="mt-0.5 h-0.5 w-8 rounded-full bg-deep" />}
              </button>
            ))}
          </nav>
        </div>
      )}

      <button
        type="button"
        style={launcherStyle}
        onPointerDown={launcherDown}
        onPointerMove={launcherMove}
        onPointerUp={launcherUp}
        onPointerCancel={launcherUp}
        aria-label={open ? "Close chat" : "Open chat"}
        className="grid size-14 touch-none select-none place-items-center rounded-full bg-brand-gold text-ink-900 shadow-brand transition-transform hover:scale-105 active:cursor-grabbing"
      >
        {open ? <X size={26} /> : <MessageSquare size={26} />}
      </button>
    </>
  );
}
