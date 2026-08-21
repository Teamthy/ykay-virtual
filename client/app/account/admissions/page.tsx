"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, GraduationCap } from "lucide-react";
import { applyAdmission, listMyAdmissions, type AdmissionStatus } from "@/features/admissions/api";
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
  const apps = useQuery({ queryKey: ["me", "admissions"], queryFn: listMyAdmissions, staleTime: 15_000 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-deep flex items-center gap-2">
            <GraduationCap className="text-primary" /> Admissions
          </h1>
          <p className="text-ink-500 text-sm mt-1">Apply to enrol a learner in a NUVORA school or programme.</p>
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
            <div key={a.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-deep">{a.applicant_name || "Application"}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {a.current_level || "—"} · {a.preferred_term || "Preferred term not set"}
                  </p>
                </div>
                <StatusBadge label={STATUS_LABEL[a.status]} kind={statusKindFor(a.status)} />
              </div>
              {a.notes && <p className="mt-3 text-sm text-ink-600 line-clamp-2">{a.notes}</p>}
              <p className="mt-3 text-[11px] text-ink-400">Submitted {new Date(a.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplyForm({ onDone }: { onDone: () => void }) {
  const learners = useQuery({ queryKey: ["onboarding", "learners"], queryFn: listLearners, staleTime: 30_000 });
  const [form, setForm] = useState({ student_profile_id: "", applicant_name: "", current_level: "", preferred_term: "", notes: "" });
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
    onError: (e) => setError(e instanceof Error ? e.message : "Could not submit application."),
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
          <input value={form.applicant_name} onChange={(e) => set("applicant_name", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm" placeholder="Learner's full name" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Current level</span>
          <input value={form.current_level} onChange={(e) => set("current_level", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm" placeholder="e.g. Year 9" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Preferred term</span>
          <input value={form.preferred_term} onChange={(e) => set("preferred_term", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm" placeholder="e.g. Autumn 2026" />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="font-medium text-ink-700">Notes</span>
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm" placeholder="Anything the admissions team should know" />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <Button variant="gold" disabled={busy || !form.student_profile_id || apply.isPending}
          onClick={() => apply.mutate()}>
          {apply.isPending ? "Submitting…" : "Submit application"}
        </Button>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
