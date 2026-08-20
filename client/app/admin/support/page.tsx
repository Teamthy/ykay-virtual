"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listSupportTickets, setSupportStatus, type SupportTicket } from "@/features/admin/api";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

const FILTERS = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function AdminSupportPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<SupportTicket | null>(null);
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

  const columns: Column<SupportTicket>[] = [
    {
      key: "subject",
      header: "Ticket",
      cell: (t) => (
        <button type="button" onClick={() => setOpen(t)} className="text-left">
          <p className="font-semibold text-brand-navy hover:underline">{t.subject}</p>
          <p className="text-[11px] text-ink-400">{t.email} · {new Date(t.created_at).toLocaleString()}</p>
        </button>
      ),
    },
    {
      key: "message",
      header: "Message",
      cell: (t) => <p className="text-sm text-ink-600 line-clamp-2 max-w-md whitespace-pre-line">{t.message}</p>,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => <StatusBadge label={t.status} kind={statusKindFor(t.status)} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (t) => (
        <div className="flex justify-end gap-2">
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy">Support tickets</h1>
        <p className="text-ink-500 text-sm mt-1">Trackable enquiries from contact forms, private-tuition requests and signed-in users.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((s) => (
          <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === s ? "bg-brand-gold text-ink-900" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(t) => t.id}
        loading={tickets.isLoading}
        empty={{
          icon: <LifeBuoy size={20} />,
          title: "No tickets in this view",
          description: "New enquiries land here as they arrive from the contact and tuition-request forms.",
        }}
      />

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{open.status}</p>
            <h2 className="mt-1 text-xl font-bold text-ink-900">{open.subject}</h2>
            <p className="mt-1 text-sm text-ink-500">{open.email} · {new Date(open.created_at).toLocaleString()}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{open.message}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {open.status === "OPEN" && (
                <Button size="sm" onClick={() => { setStatusMut.mutate({ id: open.id, s: "IN_PROGRESS" }); setOpen({ ...open, status: "IN_PROGRESS" }); }}>Start working</Button>
              )}
              {(open.status === "OPEN" || open.status === "IN_PROGRESS") && (
                <Button size="sm" variant="outline" onClick={() => { setStatusMut.mutate({ id: open.id, s: "RESOLVED" }); setOpen({ ...open, status: "RESOLVED" }); }}>Mark resolved</Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setOpen(null)}>Close</Button>
            </div>
          </div>
        </div>
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
