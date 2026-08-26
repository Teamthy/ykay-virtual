"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, GraduationCap, X } from "lucide-react";
import { listAdminAdmissions, listAdminDocuments, setAdmissionStatus, type AdmissionStatus, type Application } from "@/features/admissions/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";

const FILTERS: ("" | AdmissionStatus)[] = ["", "PENDING", "REVIEWING", "OFFERED", "ACCEPTED", "REJECTED"];

export default function AdminAdmissionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | AdmissionStatus>("PENDING");
  const [offerId, setOfferId] = useState<string | null>(null);

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
              {a.status === "OFFERED" && a.offer_fee && (
                <p className="mt-2 text-sm font-bold text-deep">
                  Offer fee: {a.offer_fee.toLocaleString()} {a.offer_currency || "NGN"}
                </p>
              )}
              <p className="mt-3 text-[11px] text-ink-400">Submitted {new Date(a.created_at).toLocaleDateString()}</p>

              <div className="mt-3">
                <DocsLink appId={a.id} />
              </div>

              {(a.status === "PENDING" || a.status === "REVIEWING") && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: a.id, s: "REVIEWING" })}>Start review</Button>
                  <Button size="sm" onClick={() => setOfferId(a.id)}>Offer place</Button>
                  <Button size="sm" variant="default" onClick={() => setStatusMut.mutate({ id: a.id, s: "REJECTED" })}>Reject</Button>
                </div>
              )}
              {a.status === "OFFERED" && (
                <div className="mt-3 flex gap-2 border-t border-ink-100 pt-3">
                  <Button size="sm" variant="gold" onClick={() => setStatusMut.mutate({ id: a.id, s: "ACCEPTED" })}>Accept</Button>
                  <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: a.id, s: "WITHDRAWN" })}>Withdraw</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {offerId && <OfferDialog appId={offerId} onClose={() => setOfferId(null)} />}
    </div>
  );
}

function DocsLink({ appId }: { appId: string }) {
  const [open, setOpen] = useState(false);
  const docs = useQuery({
    queryKey: ["admin", "admissions", appId, "documents"],
    queryFn: () => listAdminDocuments(appId),
    enabled: open,
  });
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
      >
        <FileText size={13} /> Documents ({docs.data?.length ?? 0})
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {(docs.data ?? []).map((d) => (
            <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-brand-blue hover:underline">
              <FileText size={14} /> {d.name}
            </a>
          ))}
          {docs.data && docs.data.length === 0 && <p className="text-xs text-ink-500">No documents uploaded.</p>}
        </div>
      )}
    </div>
  );
}

function OfferDialog({ appId, onClose }: { appId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [message, setMessage] = useState("");

  const offer = useMutation({
    mutationFn: () =>
      setAdmissionStatus(appId, "OFFERED", {
        offer_fee: fee ? Number(fee) : undefined,
        offer_currency: currency,
        offer_message: message || undefined,
      }),
    onSuccess: () => {
      toast.success("Offer sent");
      qc.invalidateQueries({ queryKey: ["admin", "admissions"] });
      onClose();
    },
    onError: () => toast.error("Could not send offer"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Offer a place</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
        </div>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Offer fee (optional)</span>
          <input value={fee} onChange={(e) => setFee(e.target.value)} type="number" min={0} placeholder="e.g. 50000" className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink-700">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm">
            {["NGN", "USD", "GBP"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-medium text-ink-700">Message (optional)</span>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </label>
        <Button variant="gold" className="mt-4 w-full" disabled={offer.isPending} onClick={() => offer.mutate()}>
          {offer.isPending ? "Sending…" : "Send offer"}
        </Button>
      </div>
    </div>
  );
}
