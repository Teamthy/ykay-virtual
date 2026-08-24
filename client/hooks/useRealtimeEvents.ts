"use client";

// Phase 5b realtime — one EventSource per authenticated browser tab.
//
// The API streams tiny "poke" events (message.new …) over
// GET /api/v1/me/events; on each poke we invalidate the related query caches
// so TanStack refetches through the NORMAL endpoints — realtime never
// carries data itself, it only removes the wait for the next poll tick.
//
// Robustness contract:
//   - EventSource auto-reconnects (native) with backoff.
//   - If the stream never connects (proxy blocks SSE), nothing breaks:
//     components keep their interval polling as the permanent fallback.
//   - Anonymous users never open a stream (it would only 401).

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";

type ServerEvent = {
  type: string;
  conversation_id?: string;
  message_id?: string;
};

export function useRealtimeEvents() {
  const { user, isLoading } = useSession();
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Wait for the session to resolve; only signed-in users get a stream.
    if (isLoading) return;
    if (!user || typeof EventSource === "undefined") return;

    const es = new EventSource("/api/v1/me/events");
    esRef.current = es;

    const onMessageNew = () => {
      // New message anywhere → refresh conversation lists, the open thread
      // and the notification badges. Invalidation is cheap when queries are
      // inactive (marked stale, refetch on next focus).
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    };
    const onNotificationNew = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    };

    es.addEventListener("message.new", onMessageNew);
    es.addEventListener("notification.new", onNotificationNew);
    // "recycle" arrives when the server politely ends the stream (~9 min);
    // EventSource reconnects on its own — nothing to do here.

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user, isLoading, queryClient]);
}
