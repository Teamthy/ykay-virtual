"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Inbox } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/features/messaging/api";
import { useSession } from "@/hooks/useSession";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { user, isLoading } = useSession();
  const userId = user?.id ?? "";

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const notifs = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => listNotifications(),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
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
        <EmptyState
          icon={<Inbox size={20} />}
          title="No notifications yet"
          description="Booking updates, messages and payment events will appear here."
        />
      ) : (
        <ul className="space-y-2.5">
          {notifs.data?.data.map((n) => (
            <li key={n.id}>
              <Card
                className={
                  n.is_read
                    ? "px-5 py-4"
                    : "cursor-pointer border-brand-blue/30 bg-brand-blue-light/50 px-5 py-4 transition-colors hover:bg-brand-blue-light/80"
                }
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-ink-200" : "bg-brand-blue"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-semibold text-ink-800">{n.title}</span>
                    {!n.is_read && <StatusBadge label="New" kind="info" />}
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-400">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                {n.body ? <p className="mt-1 pl-[18px] text-sm text-ink-600">{n.body}</p> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
