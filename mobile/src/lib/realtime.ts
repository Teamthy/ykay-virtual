import { useEffect, useRef } from "react";

// Lightweight real-time hook — polls a loader on an interval while the screen
// is focused. The backend has no websocket transport for chat/notifications,
// so short-interval polling is the pragmatic real-time approximation (works
// offline too when combined with the cached API client).

type PollOptions = {
  intervalMs?: number;
  enabled?: boolean;
};

export function usePolling(loader: () => void | Promise<void>, options: PollOptions = {}) {
  const { intervalMs = 10000, enabled = true } = options;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) return;
    void loaderRef.current();
    const id = setInterval(() => void loaderRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
