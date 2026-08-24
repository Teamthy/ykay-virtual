import { useEffect, useRef, useState } from "react";
import { subscribeRealtime, type RealtimeEvent } from "@/src/lib/sse";

// Lightweight real-time hook — keeps a loader fresh while a screen is
// focused. Two layers (Phase 5b mobile adoption):
//
//   1. SSE poke events (events: ["message.new"]) trigger an immediate
//      reload the moment anything relevant changes server-side.
//   2. Interval polling stays as the permanent fallback — SLOW (3×) while
//      the SSE stream is connected, full cadence when it is not (offline,
//      proxy-blocked, signed-out). If the dependency/stream is unavailable
//      the behaviour is exactly the previous polling-only hook.
//
// Works offline with the cached API client: a failed load keeps stale data.

type PollOptions = {
  intervalMs?: number;
  enabled?: boolean;
  /** SSE event names that should trigger an immediate reload. */
  events?: RealtimeEvent[];
};

export function usePolling(loader: () => void | Promise<void>, options: PollOptions = {}) {
  const { intervalMs = 10000, enabled = true, events } = options;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // True once the shared SSE stream delivered its first open/heartbeat —
  // until then (or forever, when unsupported) run at the full interval.
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void loaderRef.current();

    if (events && events.length > 0) {
      const unsubs = events.map((name) =>
        subscribeRealtime(name, () => {
          setLive(true);
          void loaderRef.current();
        })
      );
      const id = setInterval(() => void loaderRef.current(), live ? intervalMs * 3 : intervalMs);
      return () => {
        clearInterval(id);
        unsubs.forEach((u) => u());
      };
    }

    const id = setInterval(() => void loaderRef.current(), intervalMs);
    return () => clearInterval(id);
    // `live` intentionally not a dependency: the interval cadence is sampled
    // per-effect-run; a live flip re-arms it on the next natural re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, enabled, events?.join(",")]);
}
