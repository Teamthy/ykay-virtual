"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/messaging/api";

const DEV_USER = "00000000-0000-0000-0000-0000000000a1";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const notifs = useQuery({
    queryKey: ["notifications", DEV_USER],
    queryFn: () => listNotifications(DEV_USER),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(DEV_USER, id),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(DEV_USER),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = (notifs.data?.data ?? []).filter((n) => !n.is_read).length;

  return (
    <main className="container-x py-10 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Notifications</h1>
          <p className="text-ink-500 text-sm mt-1">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        )}
      </div>

      {notifs.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (notifs.data?.data.length ?? 0) === 0 ? (
        <div className="border rounded-2xl p-10 text-center text-ink-500">
          No notifications yet. Booking updates, messages and payment events will appear here.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifs.data?.data.map((n) => (
            <li
              key={n.id}
              onClick={() => {
                if (!n.is_read) markRead.mutate(n.id);
              }}
              className={`border rounded-2xl px-5 py-4 cursor-pointer transition-colors ${
                n.is_read ? "bg-white" : "bg-brand-blue/5 border-brand-blue/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-sm">{n.title}</span>
                <span className="text-[10px] text-ink-400 shrink-0">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {n.body ? <p className="text-sm text-ink-600 mt-1">{n.body}</p> : null}
              {!n.is_read && <span className="mt-2 inline-block h-2 w-2 rounded-full bg-brand-blue" />}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
