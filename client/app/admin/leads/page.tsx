"use client";

// Admin leads console — the conversion follow-up queue. New leads arrive
// here (and on the ops WhatsApp) when visitors ask for a callback or start
// an enrollment without paying. Mark them CONTACTED / CONVERTED / CLOSED as
// you work the funnel.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PhoneCall, CheckCheck, XCircle, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import {
  listLeads,
  updateLeadStatus,
  leadWhatsAppHref,
  type Lead,
} from "@/features/leads/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const TABS = [
  { key: "", label: "All" },
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "CONVERTED", label: "Converted" },
  { key: "CLOSED", label: "Closed" },
] as const;

const STATUS_KIND: Record<
  Lead["status"],
  "success" | "pending" | "info" | "neutral"
> = {
  NEW: "pending",
  CONTACTED: "info",
  CONVERTED: "success",
  CLOSED: "neutral",
};

function intentLabel(intent: string): string {
  switch (intent) {
    case "CALLBACK_REQUEST":
      return "Callback request";
    case "ENROLLMENT_STARTED":
      return "Started enrollment";
    case "GENERAL_INTEREST":
      return "Browse interest";
    default:
      return intent;
  }
}

export default function AdminLeadsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("NEW");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "leads", status, page],
    queryFn: () => listLeads({ status, page }),
    staleTime: 15_000,
  });

  const data = q.data;
  const rows = data?.leads ?? [];
  const counts = data?.counts;

  const setLead = async (id: string, next: Lead["status"]) => {
    setBusyId(id);
    try {
      await updateLeadStatus(id, next);
      toast.success(`Lead marked ${next.toLowerCase()}`);
      await qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update lead");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold text-[#0F2A1A]">
          <Users className="text-[#0F2A1A]" /> Leads
        </h1>
        <p className="mt-1 text-sm text-[#0F2A1A]/65">
          Visitors who didn&apos;t enroll — new ones also land on the ops
          WhatsApp. Follow up fast: most conversions happen in the first hour.
        </p>
      </div>

      {/* Counters */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(
          [
            { key: "NEW", label: "New", icon: <PhoneCall size={15} /> },
            {
              key: "CONTACTED",
              label: "Contacted",
              icon: <PhoneCall size={15} />,
            },
            {
              key: "CONVERTED",
              label: "Converted",
              icon: <Trophy size={15} />,
            },
            { key: "CLOSED", label: "Closed", icon: <XCircle size={15} /> },
          ] as const
        ).map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              setStatus(c.key);
              setPage(1);
            }}
            className={`rounded-2xl border bg-white p-4 text-left shadow-soft transition ${
              status === c.key
                ? "border-[#D6FF57] ring-2 ring-[#D6FF57]/20"
                : "border-black/10 hover:border-black/10"
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0F2A1A]/65">
              {c.icon}
              {c.label}
            </p>
            <p className="mt-1 font-display text-2xl text-[#0F2A1A]">
              {counts?.[c.key] ?? "…"}
            </p>
          </button>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
              status === t.key
                ? "bg-[#D6FF57] text-[#0F2A1A]"
                : "border border-black/10 bg-white text-[#0F2A1A]/70 hover:border-black/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <p className="text-sm text-[#0F2A1A]/65">Loading leads…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No leads here"
          description="New callback requests and unfinished enrollments appear here."
        />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-soft">
          {rows.map((l) => {
            const wa = leadWhatsAppHref(l);
            return (
              <li
                key={l.id}
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#0F2A1A]/85">{l.name}</p>
                    <StatusBadge
                      label={l.status}
                      kind={STATUS_KIND[l.status]}
                    />
                    <span className="rounded-full bg-[#F9F6ED] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0F2A1A]">
                      {intentLabel(l.intent)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#0F2A1A]/70">
                    {l.phone ? (
                      <span className="font-semibold">{l.phone}</span>
                    ) : null}
                    {l.email ? <span> · {l.email}</span> : null}
                  </p>
                  {l.message && (
                    <p className="mt-1 max-w-xl text-xs italic text-[#0F2A1A]/65">
                      “{l.message}”
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-[#0F2A1A]/65">
                    {l.source} ·{" "}
                    {new Date(l.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {l.converted_at ? " · converted" : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-4 text-xs font-bold text-[#0F2A1A] hover:opacity-90"
                    >
                      <PhoneCall size={13} /> WhatsApp
                    </a>
                  )}
                  {l.status === "NEW" && (
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void setLead(l.id, "CONTACTED")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#0F2A1A] px-4 text-xs font-bold text-[#0F2A1A] hover:bg-[#F9F6ED] disabled:opacity-50"
                    >
                      <CheckCheck size={13} /> Mark contacted
                    </button>
                  )}
                  {(l.status === "NEW" || l.status === "CONTACTED") && (
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void setLead(l.id, "CONVERTED")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#D6FF57] px-4 text-xs font-bold text-[#0F2A1A] hover:bg-[#F9F6ED] disabled:opacity-50"
                    >
                      <Trophy size={13} /> Enrolled
                    </button>
                  )}
                  {l.status !== "CLOSED" && l.status !== "CONVERTED" && (
                    <button
                      type="button"
                      disabled={busyId === l.id}
                      onClick={() => void setLead(l.id, "CLOSED")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 px-4 text-xs font-bold text-[#0F2A1A]/65 hover:bg-[#F9F6ED] disabled:opacity-50"
                    >
                      <XCircle size={13} /> Close
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {data?.meta && data.meta.total_items > 20 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-black/10 px-4 py-2 font-semibold text-[#0F2A1A]/70 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-[#0F2A1A]/65">
            Page {page} · {data.meta.total_items} leads
          </span>
          <button
            type="button"
            disabled={page * 20 >= data.meta.total_items}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-full border border-black/10 px-4 py-2 font-semibold text-[#0F2A1A]/70 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
