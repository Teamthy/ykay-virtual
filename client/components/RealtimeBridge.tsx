"use client";

// RealtimeBridge — mounts the SSE event stream once, app-wide (inside
// Providers). Signed-in users get instant message/notification refreshes;
// everyone else is untouched. See hooks/useRealtimeEvents.ts.

import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

export function RealtimeBridge() {
  useRealtimeEvents();
  return null;
}
