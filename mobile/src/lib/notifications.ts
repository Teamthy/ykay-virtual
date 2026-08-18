import { apiFetch } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Notifications — offline-first list + unread count, polled for real-time feel.

export type NotificationItem = {
  id: string;
  type: string;
  title?: string | null;
  body?: string | null;
  is_read: boolean;
  created_at: string;
};

const KEY = "notif:list";
const UNREAD_KEY = "notif:unread";

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
async function writeCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // best-effort
  }
}

export async function getNotifications(): Promise<NotificationItem[]> {
  try {
    const res = await apiFetch<NotificationItem[]>("/me/notifications");
    const list = res.data ?? [];
    writeCache(KEY, list).catch(() => {});
    return list;
  } catch {
    return (await readCache<NotificationItem[]>(KEY)) ?? [];
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const res = await apiFetch<{ unread: number }>("/me/notifications/unread-count");
    const n = res.data?.unread ?? 0;
    writeCache(UNREAD_KEY, n).catch(() => {});
    return n;
  } catch {
    return (await readCache<number>(UNREAD_KEY)) ?? 0;
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiFetch(`/me/notifications/${id}/read`, { method: "POST" });
    const list = await readCache<NotificationItem[]>(KEY);
    if (list) {
      writeCache(
        KEY,
        list.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      ).catch(() => {});
    }
  } catch {
    // ignore
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiFetch("/me/notifications/read-all", { method: "POST" });
    const list = await readCache<NotificationItem[]>(KEY);
    if (list) {
      writeCache(KEY, list.map((n) => ({ ...n, is_read: true }))).catch(() => {});
    }
  } catch {
    // ignore
  }
}
