"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BadgeCheck } from "lucide-react";
import {
  adminAction,
  getVettingProfile,
  listVettingQueue,
  reviewDocument,
  type AdminAction,
} from "@/features/vetting/api";
import type { ProfileDetail, TutorProfile, TutorStatus } from "@/features/vetting/types";

const DEV_ADMIN = "00000000-0000-0000-0000-0000000000b1";

const STATUSES: TutorStatus[] = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "VERIFICATION", "HOLD", "APPROVED", "REJECTED"];

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  VERIFICATION: "Verification",
  HOLD: "On hold",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  DRAFT: "Draft",
};

export default function AdminVettingPage() {
  const [status, setStatus] = useState<string>("SUBMITTED");
  const [selected, setSelected] = useState<string | null>(null);

  const queue = useQuery({
    queryKey: ["admin", "vetting", "queue", status],
    queryFn: async () => {
      const res = await listVettingQueue(DEV_ADMIN, status, 1);
      return res.data;
    },
    staleTime: 15_000,
  });

  const detail = useQuery({
    queryKey: ["admin", "vetting", "profile", selected],
    queryFn: async () => (selected ? getVettingProfile(DEV_ADMIN, selected) : null),
    enabled: !!selected,
    staleTime: 10_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-extrabold">Tutor vetting queue</h1>
          <p className="text-ink-500 text-sm mt-1">
            Review applications: documents, competency results, and full transition history.
          </p>
        </div>
        <span className="text-xs text-ink-400">Dev auth: admin id {DEV_ADMIN.slice(0, 8)}…</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              status === s ? "bg-brand-navy text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {queue.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (queue.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<BadgeCheck size={20} />}
          title="No applications in this state"
          description="Applications move through profile → subjects → documents → interview → verification → approval."
        />
      ) : (
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-start">
          <ul className="space-y-3">
            {queue.data?.map((p: TutorProfile) => (
              <li key={p.id}>
                <button
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left border rounded-2xl p-4 transition-colors ${
                    selected === p.id ? "border-brand-blue bg-brand-blue/5" : "hover:border-ink-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{p.display_name}</span>
                    <StatusBadge label={STATUS_LABEL[p.status] ?? p.status} kind={statusKindFor(p.status)} />
                  </div>
                  <p className="text-xs text-ink-500 mt-1">
                    {p.years_experience} yrs · {p.headline ?? p.slug} · ranking {p.ranking_score.toFixed(1)}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div>{selected && detail.data && <Dossier adminId={DEV_ADMIN} detail={detail.data} onChanged={() => void queue.refetch()} />}</div>
        </div>
      )}
    </div>
  );
}

function Dossier({
  adminId,
  detail,
  onChanged,
}: {
  adminId: string;
  detail: ProfileDetail;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const act = useMutation({
    mutationFn: async ({ action, r }: { action: AdminAction; r?: string }) => {
      await adminAction(adminId, detail.profile.id, action, r ?? reason);
    },
    onSuccess: () => {
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "vetting"] });
      onChanged();
    },
  });

  const reviewDoc = useMutation({
    mutationFn: async ({ docId, approve, r }: { docId: string; approve: boolean; r?: string }) => {
      await reviewDocument(adminId, docId, approve, r ?? "");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "vetting"] });
      onChanged();
    },
  });

  const p = detail.profile;
  const actionable = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "VERIFICATION", "HOLD"].includes(p.status);

  return (
    <div className="border rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold">{p.display_name}</h2>
        <p className="text-sm text-ink-500">{p.headline}</p>
        <p className="text-sm text-ink-600 mt-2">{p.bio}</p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-ink-400">Experience</dt><dd className="font-semibold">{p.years_experience} years</dd></div>
          <div><dt className="text-ink-400">Rate</dt><dd className="font-semibold">{p.currency} {p.hourly_rate_min?.toLocaleString()}/hr</dd></div>
          <div><dt className="text-ink-400">Online</dt><dd className="font-semibold">{p.accepts_online ? "Yes" : "No"}</dd></div>
          <div><dt className="text-ink-400">In person</dt><dd className="font-semibold">{p.accepts_in_person ? "Yes" : "No"}</dd></div>
        </dl>
      </div>

      {/* Documents */}
      <section>
        <h3 className="font-bold text-sm mb-2">Documents</h3>
        <ul className="space-y-2">
          {detail.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 border rounded-xl px-4 py-2 text-sm">
              <span>
                {d.type} — {d.file_name}
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                  d.status === "APPROVED" ? "bg-green-100 text-green-700"
                  : d.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>{d.status}</span>
                {d.rejection_reason ? <span className="block text-xs text-red-600">{d.rejection_reason}</span> : null}
              </span>
              {d.status === "PENDING" && (
                <span className="flex gap-2">
                  <Button size="sm" variant="default" disabled={reviewDoc.isPending}
                    onClick={() => reviewDoc.mutate({ docId: d.id, approve: true })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={reviewDoc.isPending}
                    onClick={() => {
                      const r = window.prompt("Rejection reason:");
                      if (r) reviewDoc.mutate({ docId: d.id, approve: false, r });
                    }}>Reject</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Competency */}
      <section>
        <h3 className="font-bold text-sm mb-2">Competency results</h3>
        {detail.competency.length === 0 ? (
          <p className="text-sm text-ink-400">No assessments yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {detail.competency.map((c) => (
              <li key={c.id} className="flex justify-between border-b pb-1">
                <span>Subject quiz</span>
                <span className={c.passed ? "text-green-700 font-semibold" : "text-amber-700"}>
                  {c.score}/{c.max_score} {c.passed ? "PASSED" : "FAILED"}
                  {c.expires_at ? ` · valid to ${c.expires_at.slice(0, 10)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Timeline */}
      <section>
        <h3 className="font-bold text-sm mb-2">Timeline</h3>
        <ol className="space-y-2 text-xs border-l border-ink-200 pl-4">
          {detail.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-blue" />
              <span className="font-semibold">{e.from_status ?? "—"} → {e.to_status}</span>
              <span className="text-ink-400"> · {new Date(e.created_at).toLocaleString()}</span>
              {e.notes ? <p className="text-ink-500">{e.notes}</p> : null}
            </li>
          ))}
        </ol>
      </section>

      {/* Actions */}
      {actionable && (
        <section className="border-t pt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {p.status === "SUBMITTED" && (
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "review" })}>Start review</Button>
            )}
            {p.status === "UNDER_REVIEW" && (
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "interview" })}>Move to interview</Button>
            )}
            {p.status === "INTERVIEW" && (
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "verify" })}>Move to verification</Button>
            )}
            {p.status === "VERIFICATION" && (
              <Button size="sm" variant="gold" disabled={act.isPending} onClick={() => act.mutate({ action: "approve" })}>
                Approve & publish
              </Button>
            )}
            {p.status === "HOLD" && (
              <Button size="sm" disabled={act.isPending} onClick={() => act.mutate({ action: "review" })}>Resume review</Button>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (required for reject)"
              className="flex-1 rounded-xl border border-ink-200 px-3 py-2 text-sm"
            />
            <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ action: "hold", r: reason || "paused" })}>
              Hold
            </Button>
            <Button size="sm" variant="default" disabled={act.isPending || !reason.trim()}
              onClick={() => act.mutate({ action: "reject", r: reason })}>
              Reject
            </Button>
          </div>
          {busy ? <p className="text-xs text-ink-400">Working…</p> : null}
        </section>
      )}
    </div>
  );
}
