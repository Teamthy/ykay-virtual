"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  createAdminCohort, listAdminCohorts, setAdminCohortStatus,
  listApprovedTutors, assignAdminCohortTutor,
  listCohortJoins, reviewCohortJoin, listPendingEnrollments, updateCohort,
  type AdminCohort, type AdminVettingProfile,
} from "@/features/admin/api";
import Link from "next/link";
import { listProgrammes } from "@/features/programmes/api/list";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { CalendarDays, UserCheck } from "lucide-react";

// Admin cohort manager (working-doc §12) - NUVORA design system:
// DataTable + StatusBadge (text+icon+colour) + EmptyState + Progress capacity.

const FILTERS = ["", "DRAFT", "PUBLISHED", "FULL", "ONGOING", "COMPLETED", "CANCELLED"];

export default function AdminCohortsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  // Per-row pending tutor selection, keyed by cohort id.
  const [tutorDraft, setTutorDraft] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const cohorts = useQuery({
    queryKey: ["admin", "cohorts", status, page],
    queryFn: () => listAdminCohorts({ status: status || undefined, page }),
    staleTime: 15_000,
  });

  // Approved tutors = the assignable pick-list (is_public can be toggled on
  // the vetting page; assignment requires an approved tutor).
  const approvedTutors = useQuery({
    queryKey: ["admin", "tutors", "approved"],
    queryFn: () => listApprovedTutors(),
    staleTime: 30_000,
  });

  const [editing, setEditing] = useState<AdminCohort | null>(null);

  const pending = useQuery({
    queryKey: ["admin", "pending-enrollments"],
    queryFn: () => listPendingEnrollments(100),
    refetchInterval: 60_000,
  });

  const joins = useQuery({
    queryKey: ["admin", "cohort-joins", "PENDING"],
    queryFn: () => listCohortJoins("PENDING"),
    staleTime: 15_000,
  });

  const reviewJoinMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) => reviewCohortJoin(id, status),
    onSuccess: (_d, { status }) => {
      toast.success(status === "APPROVED" ? "Tutor assigned to cohort" : "Join request rejected");
      qc.invalidateQueries({ queryKey: ["admin", "cohort-joins"] });
      qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    },
    onError: () => toast.error("Could not review join request"),
  });

  const setStatusMut = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => setAdminCohortStatus(id, s),
    onSuccess: (_d, { s }) => {
      toast.success(s === "PUBLISHED" ? "Cohort published" : `Cohort ${s.toLowerCase()}`);
      qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    },
    onError: () => toast.error("Could not update cohort"),
  });

  const assignTutorMut = useMutation({
    mutationFn: ({ id, tutorId }: { id: string; tutorId: string }) => assignAdminCohortTutor(id, tutorId),
    onSuccess: () => {
      toast.success("Tutor assigned to cohort");
      setTutorDraft({});
      qc.invalidateQueries({ queryKey: ["admin", "cohorts"] });
    },
    onError: () => toast.error("Could not assign tutor (tutor must be approved)"),
  });

  const data = cohorts.data?.data ?? [];
  const meta = cohorts.data?.meta;
  const tutors: AdminVettingProfile[] = approvedTutors.data ?? [];

  const columns: Column<AdminCohort>[] = [
    {
      key: "title",
      header: "Title",
      cell: (c) => (
        <span className="font-semibold text-ink-800 line-clamp-1 max-w-[220px]">
          {c.title}
          {c.code && <span className="mt-0.5 block font-mono text-[10px] text-ink-400">{c.code}</span>}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      cell: (c) => (
        <span className="text-xs text-ink-500">
          {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}
          <span className="block text-[10px]">{c.timezone}</span>
        </span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      cell: (c) => (
        <div className="w-28">
          <Progress value={c.capacity ? Math.min((c.enrolled_count / c.capacity) * 100, 100) : 0} size="sm" showValue={false} />
          <span className="text-[11px] text-ink-500 tabular-nums">{c.enrolled_count}/{c.capacity}</span>
        </div>
      ),
    },
    {
      key: "fee",
      header: "Fee",
      cell: (c) => <span className="text-xs font-semibold tabular-nums">{c.currency} {c.fee.toLocaleString()}</span>,
      align: "right",
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => <StatusBadge label={c.status} kind={statusKindFor(c.status)} />,
    },
    {
      key: "tutor",
      header: "Tutor",
      cell: (c) => {
        const currentId = c.tutor_profile_id ?? "";
        const draftId = tutorDraft[c.id] ?? currentId;
        const name = tutors.find((t) => t.id === draftId)?.display_name ?? "Unassigned";
        const isAwaiting = !currentId;
        return (
          <div className="flex flex-col gap-1.5 w-56">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
              <UserCheck size={12} className={isAwaiting ? "text-amber-500" : "text-emerald-600"} />
              {currentId ? name : "Awaiting tutor"}
            </span>
            <div className="flex gap-1.5">
              <select
                value={draftId}
                onChange={(e) => setTutorDraft((m) => ({ ...m, [c.id]: e.target.value }))}
                className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-xs focus:outline-none"
              >
                <option value="">— none —</option>
                {tutors.map((t) => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                className="px-2 text-[11px]"
                disabled={draftId === currentId || assignTutorMut.isPending}
                onClick={() => assignTutorMut.mutate({ id: c.id, tutorId: draftId })}
              >
                {draftId ? (currentId ? "Update" : "Assign") : "Clear"}
              </Button>
            </div>
            {approvedTutors.isLoading && (
              <span className="text-[10px] text-ink-400">Loading approved tutors…</span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
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
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-deep">Cohorts</h1>
          <p className="text-ink-500 text-sm mt-1">Create cohorts, assign tutors, manage capacity, publish.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/programmes" className="inline-flex items-center rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-deep hover:border-primary">
            Programme rosters
          </Link>
          <Button variant="gold" onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Close" : "+ New cohort"}</Button>
        </div>
      </div>

      {showCreate && <CreateCohortForm onDone={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["admin", "cohorts"] }); }} />}

      {(pending.data?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 shadow-soft">
          <h2 className="font-bold text-deep">Student enrolments awaiting payment</h2>
          <p className="mt-1 text-xs text-ink-500">
            Checkouts that started but have not paid yet — the seat-release cron frees stale seats (≤2h).
            Different from tutor join requests below.
          </p>
          <ul className="mt-4 divide-y divide-amber-100">
            {(pending.data ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold text-ink-800">{e.student_name}</p>
                  <p className="text-xs text-ink-500">
                    {e.cohort_title} · ₦{e.cohort_fee.toLocaleString()} · started {new Date(e.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                  AWAITING PAYMENT
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <CohortEditDialog cohort={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void qc.invalidateQueries({ queryKey: ["admin", "cohorts"] }); }} />
      )}

      {(joins.data?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft">
          <h2 className="font-bold text-deep">Tutor join requests</h2>
          <p className="mt-1 text-xs text-ink-500">Approve assigns the tutor to that cohort. Reject leaves assignment unchanged.</p>
          <ul className="mt-4 divide-y divide-ink-100">
            {(joins.data ?? []).map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold text-ink-800">
                    {j.tutor_slug ? (
                      <a href={`/tutors/${j.tutor_slug}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {j.tutor_name}
                      </a>
                    ) : (
                      j.tutor_name
                    )}
                    {j.tutor_status ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        j.tutor_status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {j.tutor_status === "APPROVED" ? "VERIFIED TUTOR" : `TUTOR: ${j.tutor_status}`}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-500">
                    {j.tutor_email ? `${j.tutor_email} · ` : ""}
                    {j.tutor_years_experience ? `${j.tutor_years_experience} yrs · ` : ""}
                    {j.cohort_title}
                    {j.note ? ` — ${j.note}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={reviewJoinMut.isPending} onClick={() => reviewJoinMut.mutate({ id: j.id, status: "APPROVED" })}>Approve</Button>
                  <Button size="sm" variant="outline" disabled={reviewJoinMut.isPending} onClick={() => reviewJoinMut.mutate({ id: j.id, status: "REJECTED" })}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((s) => (
          <button key={s || "all"} onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${status === s ? "bg-primary text-ink-900" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}>
            {s || "All"}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(c) => c.id}
        loading={cohorts.isLoading}
        empty={{
          icon: <CalendarDays size={20} />,
          title: "No cohorts in this view",
          description: "Create your first cohort and it will appear here with capacity and status.",
        }}
      />

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
    enrollment_opens_at: "",
    enrollment_closes_at: "",
    timezone: "Africa/Lagos",
    location_mode: "ONLINE",
    fee: "50000",
    currency: "NGN",
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Auto-load published programmes so the cohort's programme is chosen from a
  // dropdown (the ID is filled automatically — no hand-typed UUIDs).
  const programmesQ = useQuery({
    queryKey: ["admin", "cohort-programmes"],
    queryFn: () => listProgrammes({ page_size: 200 }),
    staleTime: 60_000,
  });
  const programmes = programmesQ.data?.data ?? [];

  // Cohort images are real JPEG/PNG file uploads — never a pasted URL.
  const pickBanner = (file: File | null) => {
    setError(null);
    if (!file) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      setError("Banner image must be a JPEG or PNG file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Banner image must be under 10 MB");
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!form.programme_id.trim() || !form.title.trim() || !form.start_date || !form.end_date) {
      setError("Programme, title, start and end dates are required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createAdminCohort({
        programme_id: form.programme_id,
        title: form.title,
        capacity: Number(form.capacity),
        start_date: form.start_date,
        end_date: form.end_date,
        enrollment_opens_at: form.enrollment_opens_at || undefined,
        enrollment_closes_at: form.enrollment_closes_at || undefined,
        timezone: form.timezone,
        location_mode: form.location_mode,
        fee: Number(form.fee),
        currency: form.currency,
        status: "DRAFT",
      });
      // Upload the banner image (raw JPEG/PNG body) once the cohort exists.
      if (bannerFile && created?.id) {
        const res = await fetch(`/api/v1/admin/cohorts/${created.id}/banner`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": bannerFile.type },
          body: bannerFile,
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.error?.message || "Banner upload failed — cohort was created without an image");
        }
      }
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
      <span className="font-medium text-ink-700">{label}</span>
      <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none" />
    </label>
  );

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6 space-y-4 shadow-soft">
      <h2 className="font-bold text-deep">New cohort</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Programme *</span>
          <select
            value={form.programme_id}
            onChange={(e) => setForm({ ...form, programme_id: e.target.value })}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
          >
            <option value="">Select a programme…</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {programmes.length === 0 && (
            <span className="mt-1 block text-xs text-ink-400">
              {programmesQ.isLoading ? "Loading programmes…" : "No published programmes yet."}
            </span>
          )}
        </label>
        {field("title", "Title *")}
        {field("start_date", "Start date *", "date")}
        {field("end_date", "End date *", "date")}
        {field("enrollment_opens_at", "Enrolment opens (optional)", "date")}
        {field("enrollment_closes_at", "Enrolment closes (optional)", "date")}
        {field("capacity", "Capacity", "number")}
        {field("fee", "Fee", "number")}
        {field("timezone", "Timezone")}
        {field("currency", "Currency")}
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Banner image (JPEG/PNG file)</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={(e) => pickBanner(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold"
          />
          {bannerPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerPreview} alt="Banner preview" className="mt-2 h-20 w-full rounded-lg object-cover ring-1 ring-ink-200" />
          ) : (
            <span className="mt-1 block text-xs text-ink-400">Optional — upload a JPEG or PNG image (never a URL).</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Location mode</span>
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


// CohortEditDialog — edit title/capacity/dates/fee/enrolment window. Slug,
// tutor assignment and status keep their dedicated actions.
function CohortEditDialog({ cohort, onClose, onSaved }: { cohort: AdminCohort; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: cohort.title ?? "",
    capacity: String(cohort.capacity ?? 20),
    start_date: (cohort.start_date ?? "").slice(0, 10),
    end_date: (cohort.end_date ?? "").slice(0, 10),
    timezone: cohort.timezone || "Africa/Lagos",
    location_mode: cohort.location_mode || "ONLINE",
    fee: String(cohort.fee ?? 0),
    currency: cohort.currency || "NGN",
    enrollment_opens_at: "",
    enrollment_closes_at: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateCohort(cohort.id, {
        title: form.title,
        capacity: Number(form.capacity) || 0,
        start_date: form.start_date,
        end_date: form.end_date,
        timezone: form.timezone,
        location_mode: form.location_mode,
        fee: Number(form.fee) || 0,
        currency: form.currency,
        enrollment_opens_at: form.enrollment_opens_at || undefined,
        enrollment_closes_at: form.enrollment_closes_at || undefined,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const field = "mt-1 h-10 w-full rounded-lg border border-ink-200 px-3 text-sm focus:border-primary focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Edit cohort">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-extrabold text-deep">Edit cohort</h3>
          <button onClick={onClose} className="rounded-lg border border-ink-200 px-3 py-1 text-xs font-bold text-ink-600">Close</button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-ink-600 sm:col-span-2">Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">Capacity
            <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">Fee ({form.currency})
            <input type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">Start date
            <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">End date
            <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">Enrolment opens (optional)
            <input type="date" value={form.enrollment_opens_at} onChange={(e) => setForm({ ...form, enrollment_opens_at: e.target.value })} className={field} />
          </label>
          <label className="text-xs font-bold text-ink-600">Enrolment closes (optional)
            <input type="date" value={form.enrollment_closes_at} onChange={(e) => setForm({ ...form, enrollment_closes_at: e.target.value })} className={field} />
          </label>
        </div>
        <p className="mt-3 text-[11px] text-ink-400">Capacity cannot drop below the enrolled count; the server rejects it.</p>
        <button onClick={() => void save()} disabled={busy || !form.title} className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-bold text-ink-900 disabled:opacity-40">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
