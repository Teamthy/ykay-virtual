"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { listAdminAdmissions, setAdmissionStatus, type AdmissionStatus } from "@/features/admissions/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";

const FILTERS: ("" | AdmissionStatus)[] = ["", "PENDING", "REVIEWING", "OFFERED", "ACCEPTED", "REJECTED"];

export default function AdminAdmissionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | AdmissionStatus>("PENDING");

  const queue = useQuery({
    queryKey: ["admin", "admissions", status],
    queryFn: () => listAdminAdmissions(status || undefined),
    staleTime: 15_000,
  });
  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: AdmissionStatus }) => setAdmissionStatus(id, s),
    onSuccess: () => {
      toast.success("Application updated");
      qc.invalidateQueries({ queryKey: ["admin", "admissions"] });
    },
    onError: () => toast.error("Could not update application"),
  });

  const rows = queue.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-deep flex items-center gap-2">
          <GraduationCap className="text-primary" /> Admissions
        </h1>
        <p className="text-ink-500 text-sm mt-1">Review enrolment applications: offer, accept or reject.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-primary text-ink-900" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} />}
          title="No applications in this view"
          description="New admissions applications will appear here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((a) => (
            <div key={a.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-deep">{a.applicant_name || "Application"}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {a.current_level || "—"} · {a.preferred_term || "—"}
                  </p>
                </div>
                <StatusBadge label={a.status} kind={statusKindFor(a.status)} />
              </div>
              {a.notes && <p className="mt-3 text-sm text-ink-600 line-clamp-2">{a.notes}</p>}
              <p className="mt-3 text-[11px] text-ink-400">Submitted {new Date(a.created_at).toLocaleDateString()}</p>

              {(a.status === "PENDING" || a.status === "REVIEWING") && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: a.id, s: "REVIEWING" })}>Start review</Button>
                  <Button size="sm" onClick={() => setStatusMut.mutate({ id: a.id, s: "OFFERED" })}>Offer place</Button>
                  <Button size="sm" variant="default" onClick={() => setStatusMut.mutate({ id: a.id, s: "REJECTED" })}>Reject</Button>
                </div>
              )}
              {a.status === "OFFERED" && (
                <div className="mt-4 flex gap-2 border-t border-ink-100 pt-4">
                  <Button size="sm" variant="gold" onClick={() => setStatusMut.mutate({ id: a.id, s: "ACCEPTED" })}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: a.id, s: "WITHDRAWN" })}>Withdraw</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
