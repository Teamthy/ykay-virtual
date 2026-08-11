"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { createAdminCohort, listAdminCohorts, setAdminCohortStatus, type AdminCohort } from "@/features/admin/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-ink-100 text-ink-600",
  PUBLISHED: "bg-green-100 text-green-700",
  FULL: "bg-amber-100 text-amber-700",
  ONGOING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-ink-100 text-ink-400",
  CANCELLED: "bg-red-100 text-red-700",
};

// Admin cohort manager (working-doc §12): create, publish/unpublish, capacity,
// timetable, enrolments, status.
export default function AdminCohortsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const cohorts = useQuery({
    queryKey: ["admin", "cohorts", status, page],
    queryFn: () => listAdminCohorts({ status: status || undefined, page }),
    staleTime: 15_000,
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => setAdminCohortStatus(id, s),
    onSuccess: (_d, { s }) => {
      toast.success(s === "PUBLISHED" ? "Cohort published" : `Cohort ${s.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    },
    onError: () => toast.error("Could not update cohort"),
  });

  const data = cohorts.data?.data ?? [];
  const meta = cohorts.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Cohorts</h1>
          <p className="text-ink-500 text-sm mt-1">Create cohorts, assign tutors, manage capacity, publish.</p>
        </div>
        <Button variant="gold" onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Close" : "+ New cohort"}</Button>
      </div>

      {showCreate && <CreateCohortForm onDone={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["admin", "cohorts"] }); }} />}

      <div className="flex gap-2 flex-wrap">
        {["", "DRAFT", "PUBLISHED", "FULL", "ONGOING", "COMPLETED", "CANCELLED"].map((s) => (
          <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === s ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      {cohorts.isLoading ? (
        <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
      ) : data.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center text-ink-500">No cohorts yet — create your first one.</div>
      ) : (
        <div className="border rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-ink-50 text-left text-xs text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Dates</th>
                <th className="px-5 py-3 font-semibold">Capacity</th>
                <th className="px-5 py-3 font-semibold">Fee</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c: AdminCohort) => (
                <tr key={c.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-5 py-3 font-semibold max-w-[240px] truncate">{c.title}</td>
                  <td className="px-5 py-3 text-xs text-ink-500">
                    {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
                    <span className="block text-[10px]">{c.timezone}</span>
                  </td>
                  <td className="px-5 py-3 text-xs">{c.enrolled_count}/{c.capacity}</td>
                  <td className="px-5 py-3 font-semibold text-xs">{c.currency} {c.fee.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE[c.status] ?? "bg-ink-100"}`}>{c.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {c.status === "DRAFT" && (
                      <Button size="sm" onClick={() => setStatusMut.mutate({ id: c.id, s: "PUBLISHED" })}>Publish</Button>
                    )}
                    {c.status === "PUBLISHED" && (
                      <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: c.id, s: "CANCELLED" })}>Cancel</Button>
                    )}
                    {c.status === "FULL" && (
                      <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: c.id, s: "ONGOING" })}>Start</Button>
                    )}
                    {c.status === "ONGOING" && (
                      <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: c.id, s: "COMPLETED" })}>Complete</Button>
                    )}
                    {c.status === "CANCELLED" && (
                      <Button size="sm" variant="outline" onClick={() => setStatusMut.mutate({ id: c.id, s: "DRAFT" })}>Restore</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

function CreateCohortForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    programme_id: "",
    title: "",
    capacity: "20",
    start_date: "",
    end_date: "",
    timezone: "Africa/Lagos",
    location_mode: "ONLINE",
    fee: "50000",
    currency: "NGN",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.programme_id.trim() || !form.title.trim() || !form.start_date || !form.end_date) {
      setError("Programme id, title, start and end dates are required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createAdminCohort({
        programme_id: form.programme_id,
        title: form.title,
        capacity: Number(form.capacity),
        start_date: form.start_date,
        end_date: form.end_date,
        timezone: form.timezone,
        location_mode: form.location_mode,
        fee: Number(form.fee),
        currency: form.currency,
        status: "DRAFT",
      });
      toast.success("Cohort created (DRAFT)");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create cohort");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
    </label>
  );

  return (
    <div className="border rounded-2xl p-6 space-y-4 bg-white">
      <h2 className="font-bold">New cohort</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {field("programme_id", "Programme ID *")}
        {field("title", "Title *")}
        {field("start_date", "Start date *", "date")}
        {field("end_date", "End date *", "date")}
        {field("capacity", "Capacity", "number")}
        {field("fee", "Fee", "number")}
        {field("timezone", "Timezone")}
        {field("currency", "Currency")}
        <label className="block text-sm">
          <span className="font-medium">Location mode</span>
          <select value={form.location_mode} onChange={(e) => setForm({ ...form, location_mode: e.target.value })}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm">
            <option>ONLINE</option><option>IN_PERSON</option><option>HYBRID</option>
          </select>
        </label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-3">
        <Button variant="gold" disabled={busy} onClick={() => void submit()}>{busy ? "Creating…" : "Create draft cohort"}</Button>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
