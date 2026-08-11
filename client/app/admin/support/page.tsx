"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listSupportTickets, setSupportStatus, type SupportTicket } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-ink-100 text-ink-500",
};

export default function AdminSupportPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const tickets = useQuery({
    queryKey: ["admin", "support", status, page],
    queryFn: () => listSupportTickets({ status: status || undefined, page }),
    staleTime: 15_000,
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => setSupportStatus(id, s),
    onSuccess: () => {
      toast.success("Ticket updated");
      qc.invalidateQueries({ queryKey: ["admin", "support"] });
    },
    onError: () => toast.error("Could not update ticket"),
  });

  const data = tickets.data?.data ?? [];
  const meta = tickets.data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Support tickets</h1>
        <p className="text-ink-500 text-sm mt-1">Trackable enquiries from contact forms, private-tuition requests and signed-in users.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
          <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === s ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {tickets.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : data.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center text-ink-500">No tickets in this view.</div>
      ) : (
        <ul className="space-y-3">
          {data.map((t: SupportTicket) => (
            <li key={t.id} className="border rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm">{t.subject}</p>
                  <p className="text-[11px] text-ink-400">{t.email} · {new Date(t.created_at).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[t.status] ?? "bg-ink-100"}`}>{t.status}</span>
              </div>
              <p className="mt-2 text-sm text-ink-600 whitespace-pre-line">{t.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.status === "OPEN" && (
                  <Button size="sm" onClick={() => setStatusMut.mutate({ id: t.id, s: "IN_PROGRESS" })}>Start working</Button>
                )}
                {(t.status === "OPEN" || t.status === "IN_PROGRESS") && (
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: t.id, s: "RESOLVED" })}>Mark resolved</Button>
                )}
                {t.status !== "CLOSED" && (
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: t.id, s: "CLOSED" })}>Close</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.total_pages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-sm text-ink-500 self-center">Page {meta.page} / {meta.total_pages}</span>
          <Button size="sm" variant="outline" disabled={!meta.has_next} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
