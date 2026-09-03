"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ClipboardList,
  FileText,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import {
  acceptAdmission,
  addDocument,
  applyAdmission,
  listMyAdmissions,
  listMyDocuments,
  removeDocument,
  type AdmissionStatus,
  type Application,
} from "@/features/admissions/api";
import { listLearners } from "@/features/onboarding/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<AdmissionStatus, string> = {
  PENDING: "Submitted",
  REVIEWING: "Under review",
  OFFERED: "Offer received",
  ACCEPTED: "Accepted",
  REJECTED: "Not offered",
  WITHDRAWN: "Withdrawn",
};

export default function AdmissionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const apps = useQuery({
    queryKey: ["me", "admissions"],
    queryFn: listMyAdmissions,
    staleTime: 15_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-deep flex items-center gap-2">
            <GraduationCap className="text-primary" /> Admissions
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Apply to enrol a learner in a YK-Virtual school or programme.
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "+ New application"}
        </Button>
      </div>

      {showForm && (
        <ApplyForm
          onDone={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["me", "admissions"] });
          }}
        />
      )}

      {apps.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (apps.data ?? []).length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} />}
          title="No applications yet"
          description="Apply to a school or programme and track it here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(apps.data ?? []).map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplyForm({ onDone }: { onDone: () => void }) {
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    staleTime: 30_000,
  });
  const [form, setForm] = useState({
    student_profile_id: "",
    applicant_name: "",
    current_level: "",
    preferred_term: "",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useMutation({
    mutationFn: () =>
      applyAdmission({
        student_profile_id: form.student_profile_id,
        applicant_name: form.applicant_name || undefined,
        current_level: form.current_level || undefined,
        preferred_term: form.preferred_term || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      toast.success("Application submitted — we'll review it shortly.");
      onDone();
    },
    onError: (e) =>
      setError(
        e instanceof Error ? e.message : "Could not submit application.",
      ),
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-4 shadow-soft">
      <h2 className="font-bold text-deep">New application</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Learner *</span>
          <select
            value={form.student_profile_id}
            onChange={(e) => set("student_profile_id", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
          >
            <option value="">Select a learner…</option>
            {(learners.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.first_name} {l.last_name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Applicant name</span>
          <input
            value={form.applicant_name}
            onChange={(e) => set("applicant_name", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
            placeholder="Learner's full name"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Current level</span>
          <input
            value={form.current_level}
            onChange={(e) => set("current_level", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
            placeholder="e.g. Year 9"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Preferred term</span>
          <input
            value={form.preferred_term}
            onChange={(e) => set("preferred_term", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
            placeholder="e.g. Autumn 2026"
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-ink-700">Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm"
            placeholder="Anything the admissions team should know"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button
          variant="gold"
          disabled={busy || !form.student_profile_id || apply.isPending}
          onClick={() => apply.mutate()}
        >
          {apply.isPending ? "Submitting…" : "Submit application"}
        </Button>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const qc = useQueryClient();
  const [showDocs, setShowDocs] = useState(false);

  const docs = useQuery({
    queryKey: ["me", "admissions", app.id, "documents"],
    queryFn: () => listMyDocuments(app.id),
    enabled: showDocs,
  });

  const accept = useMutation({
    mutationFn: () => acceptAdmission(app.id),
    onSuccess: (res) => {
      toast.success("Offer accepted — order created");
      qc.invalidateQueries({ queryKey: ["me", "admissions"] });
      window.location.href = `/receipts/${res.order.id}`;
    },
    onError: () => toast.error("Could not accept the offer"),
  });

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-deep">
            {app.applicant_name || "Application"}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {app.current_level || "—"} ·{" "}
            {app.preferred_term || "Preferred term not set"}
          </p>
        </div>
        <StatusBadge
          label={STATUS_LABEL[app.status]}
          kind={statusKindFor(app.status)}
        />
      </div>
      {app.notes && (
        <p className="mt-3 text-sm text-ink-600 line-clamp-2">{app.notes}</p>
      )}

      {app.status === "OFFERED" && app.offer_fee ? (
        <div className="mt-3 rounded-xl bg-green-50 border border-green-200 p-3">
          <p className="text-sm font-bold text-deep">
            Offer fee: {app.offer_fee.toLocaleString()}{" "}
            {app.offer_currency || "NGN"}
          </p>
          {app.offer_message && (
            <p className="mt-1 text-xs text-ink-600">{app.offer_message}</p>
          )}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-ink-400">
          Submitted {new Date(app.created_at).toLocaleDateString()}
        </p>
        <button
          onClick={() => setShowDocs((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-blue hover:underline"
        >
          <FileText size={13} /> Documents ({docs.data?.length ?? 0})
        </button>
      </div>

      {showDocs && (
        <DocumentsPanel
          appId={app.id}
          onChanged={() =>
            qc.invalidateQueries({
              queryKey: ["me", "admissions", app.id, "documents"],
            })
          }
        />
      )}

      {app.status === "OFFERED" && (
        <div className="mt-4 border-t border-ink-100 pt-3">
          <Button
            variant="gold"
            onClick={() => accept.mutate()}
            disabled={accept.isPending}
            className="w-full"
          >
            {accept.isPending ? "Accepting…" : "Accept offer & enrol"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DocumentsPanel({
  appId,
  onChanged,
}: {
  appId: string;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["me", "admissions", appId, "documents"],
    queryFn: () => listMyDocuments(appId),
    enabled: !!appId,
  });
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const add = useMutation({
    mutationFn: () => addDocument(appId, { name, url }),
    onSuccess: () => {
      setName("");
      setUrl("");
      qc.invalidateQueries({
        queryKey: ["me", "admissions", appId, "documents"],
      });
    },
  });
  const remove = useMutation({
    mutationFn: (docId: string) => removeDocument(appId, docId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["me", "admissions", appId, "documents"],
      }),
  });

  return (
    <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3">
      <div className="space-y-2">
        {(docs.data ?? []).map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <a
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-brand-blue hover:underline"
            >
              <FileText size={14} /> {d.name}
            </a>
            <button
              onClick={() => remove.mutate(d.id)}
              className="text-ink-400 hover:text-red-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {docs.data && docs.data.length === 0 && (
          <p className="text-xs text-ink-500">No documents attached yet.</p>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Birth certificate)"
          className="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs"
        />
        <Button
          size="sm"
          onClick={() => add.mutate()}
          disabled={!name.trim() || !url.trim() || add.isPending}
        >
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
