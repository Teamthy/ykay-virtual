import EventSource from "react-native-sse";
import { API_BASE, getToken } from "@/src/lib/api";

// Realtime SSE manager (Phase 5b mobile adoption).
//
// One app-wide connection to GET /me/events (Bearer-authenticated), shared
// refcounted across screens. The server recycles the stream ~every 9 min;
// react-native-sse reconnects automatically. Consumers subscribe by event
// name; if the connection or the dependency is unavailable, callers simply
// keep their interval polling — SSE is a latency optimisation here, never a
// correctness dependency.

type Listener = () => void;

// Event names carried by GET /me/events (see internal/realtime/broker.go)
// plus the transport-level events react-native-sse emits.
export type RealtimeEvent = "message.new" | "notification.new" | "open" | "error";

let es: EventSource<RealtimeEvent> | null = null;
let refCount = 0;
const listeners = new Map<RealtimeEvent, Set<Listener>>();
let connecting = false;

function dispatch(name: RealtimeEvent) {
  const set = listeners.get(name);
  if (!set) return;
  for (const cb of set) {
    try {
      cb();
    } catch {
      // a listener error must never break the others
    }
  }
}

async function connect() {
  if (es || connecting) return;
  connecting = true;
  try {
    const token = await getToken();
    if (!token) return; // signed out — screens poll; next subscribe retries
    const stream = new EventSource<RealtimeEvent>(`${API_BASE}/me/events`, {
      headers: { Authorization: `Bearer ${token}` },
      // library default reconnect (5s) is what we want on drops/recycles;
      // the 25s server heartbeats keep intermediaries from idling us out.
    });
    es = stream;
    for (const name of Array.from(listeners.keys()) as RealtimeEvent[]) {
      // (re)bind every registered event name on a fresh connection
      stream.addEventListener(name, () => dispatch(name));
    }
    stream.addEventListener("open", () => {
      // Fresh connection: refresh everything once — covers events missed
      // while disconnected.
      dispatch("message.new");
      dispatch("notification.new");
    });
  } finally {
    connecting = false;
  }
}

function maybeClose() {
  if (refCount === 0 && es) {
    try {
      es.removeAllEventListeners();
      es.close();
    } catch {
      // already closed
    }
    es = null;
  }
}

export function subscribeRealtime(name: RealtimeEvent, cb: Listener): () => void {
  let set = listeners.get(name);
  if (!set) {
    set = new Set<Listener>();
    listeners.set(name, set);
    es?.addEventListener(name, () => dispatch(name));
  }
  set.add(cb);
  refCount += 1;
  void connect();
  return () => {
    set.delete(cb);
    refCount -= 1;
    maybeClose();
  };
}
