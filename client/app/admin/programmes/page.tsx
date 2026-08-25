"use client";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { listProgrammes } from "@/features/programmes/api/list";
import { createAdminProgramme, updateProgramme, setAdminProgrammeStatus } from "@/features/admin/api";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const INPUT_CLS =
  "mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function AdminProgrammesPage() {
  const qc = useQueryClient();
  const programmes = useQuery({
    queryKey: ["admin", "programmes"],
    queryFn: () => listProgrammes({ page_size: 100 }),
    staleTime: 30_000,
  });
  const rows = programmes.data?.data ?? [];
  const [editing, setEditing] = useState<(typeof rows)[number] | null>(null);

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) => setAdminProgrammeStatus(id, status),
    onSuccess: () => {
      toast.success("Programme status updated");
      void qc.invalidateQueries({ queryKey: ["admin", "programmes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update status"),
  });

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    format: "COHORT",
    currency: "NGN",
    price_min: "",
    price_max: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createAdminProgramme({
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        summary: form.summary.trim() || undefined,
        format: form.format,
        currency: form.currency || "NGN",
        price_min: form.price_min ? Number(form.price_min) : undefined,
        price_max: form.price_max ? Number(form.price_max) : undefined,
      });
      toast.success(`Programme "${created.title}" created (DRAFT)`);
      await qc.invalidateQueries({ queryKey: ["admin", "programmes"] });
      setCreating(false);
      setForm({ title: "", slug: "", summary: "", format: "COHORT", currency: "NGN", price_min: "", price_max: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create programme");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-deep flex items-center gap-2">
            <BookOpen className="text-primary" /> Programmes
          </h1>
          <p className="text-ink-500 text-sm mt-1">
            Create programme pages, then open a roster for cohorts, students and tutors.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-primary-hover"
        >
          <Plus size={15} /> Create programme
        </button>
      </div>

      {programmes.isLoading ? (
        <p className="text-sm text-ink-500">Loading programmes…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={20} />}
          title="No programmes yet"
          description="Create your first programme page here - it starts as a DRAFT and goes live when you publish it."
        />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white shadow-soft">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-bold text-ink-800">{p.title}</p>
                <p className="text-xs text-ink-500">{p.slug} · {p.format}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={p.status} kind={statusKindFor(p.status)} />
                <Link
                  href={`/programmes/${p.slug}`}
                  className="text-xs font-semibold text-deep hover:underline"
                >
                  Public page ↗
                </Link>
                <Link
                  href={`/admin/programmes/${p.slug}`}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-ink-900"
                >
                  Open roster
                </Link>
                <button
                  onClick={() => setEditing(p)}
                  className="rounded-full border border-ink-200 px-4 py-2 text-xs font-bold text-ink-700 hover:border-ink-300"
                >
                  Edit
                </button>
                {p.status === "DRAFT" && (
                  <button onClick={() => statusMut.mutate({ id: p.id, status: "PUBLISHED" })} className="rounded-full bg-deep px-4 py-2 text-xs font-bold text-white">Publish</button>
                )}
                {p.status === "PUBLISHED" && (
                  <button onClick={() => statusMut.mutate({ id: p.id, status: "ARCHIVED" })} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Archive</button>
                )}
                {p.status === "ARCHIVED" && (
                  <button onClick={() => statusMut.mutate({ id: p.id, status: "DRAFT" })} className="rounded-full border border-ink-200 px-4 py-2 text-xs font-bold text-ink-700">Restore</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <Modal open onClose={() => setEditing(null)} title="Edit programme">
          <ProgrammeEditForm
            programme={editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ["admin", "programmes"] });
            }}
          />
        </Modal>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create programme">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block text-sm">
            <span className="font-medium text-ink-700">Title *</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. IGCSE Mathematics Mastery"
              className={INPUT_CLS}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink-700">Slug (URL) — auto-generated from the title when blank</span>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="igcse-mathematics-mastery"
              className={INPUT_CLS}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink-700">Summary</span>
            <textarea
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={2}
              placeholder="One or two sentences shown on the programme page and in search results."
              className={INPUT_CLS}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Format</span>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className={INPUT_CLS}>
                <option>COHORT</option>
                <option>PRIVATE</option>
                <option>BOOTCAMP</option>
                <option>HOLIDAY</option>
                <option>ONLINE_CLASS</option>
                <option>HYBRID</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Currency</span>
              <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={INPUT_CLS} />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Price from</span>
              <input
                type="number"
                min="0"
                value={form.price_min}
                onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Price to</span>
              <input
                type="number"
                min="0"
                value={form.price_max}
                onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-ink-900 disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create DRAFT programme"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-ink-400">
            The page goes live at <code>/programmes/&lt;slug&gt;</code> once you publish it from this console.
          </p>
        </form>
      </Modal>
    </div>
  );
}


function ProgrammeEditForm({ programme, onDone }: { programme: { id: string; title: string; summary?: string | null; currency?: string; price_min?: number | null; price_max?: number | null }; onDone: () => void }) {
  const [form, setForm] = useState({
    title: programme.title ?? "",
    summary: programme.summary ?? "",
    currency: programme.currency || "NGN",
    price_min: String(programme.price_min ?? ""),
    price_max: String(programme.price_max ?? ""),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateProgramme(programme.id, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        price_min: form.price_min ? Number(form.price_min) : 0,
        price_max: form.price_max ? Number(form.price_max) : 0,
        currency: form.currency || "NGN",
        is_featured: false,
      });
      toast.success("Programme updated");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-ink-700">Title *</span>
        <input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT_CLS} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink-700">Summary</span>
        <textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className={INPUT_CLS} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Price min</span>
          <input type="number" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Price max</span>
          <input type="number" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })} className={INPUT_CLS} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink-700">Currency</span>
          <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={INPUT_CLS} />
        </label>
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
