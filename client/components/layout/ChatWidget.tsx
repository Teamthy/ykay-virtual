"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { X, MessageCircle, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createChatThread,
  listChatThreads,
  listChatMessages,
  sendChatMessage,
} from "@/features/chat/api";
import { useSession } from "@/hooks/useSession";
import { loginWithReturn } from "@/lib/safe-next";

// Floating AI assistant — mini chat panel. Opens the latest thread (or starts
// a new one), streams replies from the chat API, and links to the full page.

export function ChatWidget() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Moveable launcher: the user can drag the chat bubble to any corner/spot
  // (industry-standard widget behaviour). null = default bottom-right.
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
    // Only initialise client-side; anchor at the default bottom-right position.
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
    const x = Math.min(Math.max(0, e.clientX - d.offX), window.innerWidth - size);
    const y = Math.min(Math.max(0, e.clientY - d.offY), window.innerHeight - size);
    setAnchor({ x, y });
  };

  const launcherUp = () => {
    const wasMoved = drag.current?.moved ?? false;
    drag.current = null;
    // Toggle the panel only on a click (not after a drag).
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
    enabled: !!threadId && open,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, sending, open]);

  const startThread = async () => {
    try {
      const t = await createChatThread();
      qc.invalidateQueries({ queryKey: ["chat", "widget-threads"] });
      setThreadId(t.id);
    } catch {
      router.push(loginWithReturn());
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    if (!threadId) {
      await startThread();
    }
    setInput("");
    setSending(true);
    const tId = threadId!;
    try {
      const { reply } = await sendChatMessage(tId, text);
      qc.invalidateQueries({ queryKey: ["chat", "widget-messages"] });
      qc.setQueryData(["chat", "widget-messages", tId], (old: unknown) => {
        const list = (old as { id: string; role: string; content: string; created_at: string }[] | undefined) ?? [];
        return [
          ...list,
          { id: `u-${Date.now()}`, thread_id: tId, role: "user", content: text, created_at: new Date().toISOString() },
          { id: `a-${Date.now()}`, thread_id: tId, role: "assistant", content: reply, created_at: new Date().toISOString() },
        ];
      });
    } catch {
      qc.invalidateQueries({ queryKey: ["chat", "widget-messages"] });
    } finally {
      setSending(false);
    }
  };

  const launcherStyle: React.CSSProperties = anchor
    ? { position: "fixed", left: anchor.x, top: anchor.y, zIndex: 50 }
    : { position: "fixed", right: 32, bottom: 32, zIndex: 50 };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-8 z-50 flex h-[480px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-full bg-brand-gold text-sm">✨</span>
              <div>
                <p className="text-sm font-bold leading-tight">Nuvora Assistant</p>
                <p className="text-[11px] text-white/70">AI support · human handoff available</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
                aria-label="Open full chat page"
              >
                <Maximize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-white/10"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {!user ? (
              <p className="py-8 text-center text-sm text-ink-500">
                <button onClick={() => router.push(loginWithReturn())} className="font-semibold text-brand-gold-dark hover:underline">
                  Log in
                </button>{" "}
                to chat with Nuvora.
              </p>
            ) : (messages.data ?? []).length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl">👋</p>
                <p className="mt-2 text-sm font-semibold text-ink-700">Hi there! Ask me anything.</p>
                <p className="mt-1 text-xs text-ink-400">Programmes, cohorts, tutors, fees — or ask for a human.</p>
              </div>
            ) : (
              (messages.data ?? []).map((m) => (
                <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.role === "user"
                        ? "rounded-br-md bg-brand-navy text-white"
                        : "rounded-bl-md bg-[#FFF8E8] text-ink-800"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-[#FFF8E8] px-3.5 py-2.5 text-xs text-ink-400">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-400" />
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:120ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-400 [animation-delay:240ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-ink-100 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                placeholder="Ask Nuvora…"
                className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm focus:border-brand-gold focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || sending}
                className="rounded-lg bg-brand-gold px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moveable launcher */}
      <button
        type="button"
        style={launcherStyle}
        onPointerDown={launcherDown}
        onPointerMove={launcherMove}
        onPointerUp={launcherUp}
        onPointerCancel={launcherUp}
        aria-label={open ? "Close chat" : "Open chat"}
        className="grid size-14 touch-none select-none place-items-center rounded-full bg-brand-gold text-ink-900 shadow-[0_8px_24px_rgba(244,180,0,0.45)] transition-transform hover:scale-105 active:cursor-grabbing"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
}
