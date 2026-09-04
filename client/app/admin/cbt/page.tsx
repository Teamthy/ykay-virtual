"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Eye,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  adminCreateBankQuestion,
  adminDeleteBankQuestion,
  adminImportBankCSV,
  adminListBankQuestions,
  adminSetBankQuestionStatus,
  listBankSubjects,
} from "@/features/cbt/api";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";

// /admin/cbt — the shared practice-bank console: browse/filter, publish
// toggle, delete, single-question authoring and idempotent CSV import.
// The bank itself is single-sourced from cbt-bank/build.py (embedded in the
// API binary); this console is for curation on top of it.

const LETTERS = ["A", "B", "C", "D"];

export default function AdminCBTBankPage() {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 20;

  const subjects = useQuery({
    queryKey: ["cbt", "bank", "subjects"],
    queryFn: listBankSubjects,
    staleTime: 60_000,
  });

  const list = useQuery({
    queryKey: ["admin", "cbt", "questions", subject, page],
    queryFn: () => adminListBankQuestions(subject, page, pageSize),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "cbt", "questions"] });

  const toggleStatus = async (
    id: string,
    status: string,
    stem: string,
  ) => {
    const next = status === "published" ? "draft" : "published";
    try {
      await adminSetBankQuestionStatus(id, next);
      toast.success(
        next === "published" ? "Question published" : "Moved to draft",
        { description: stem.slice(0, 70) + "…" },
      );
      await invalidate();
      await qc.invalidateQueries({ queryKey: ["cbt", "bank", "subjects"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await adminDeleteBankQuestion(id);
      toast.success("Question deleted");
      setConfirmDelete(null);
      await invalidate();
      await qc.invalidateQueries({ queryKey: ["cbt", "bank", "subjects"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const importCSV = async (file: File) => {
    const t = toast.loading(`Importing ${file.name}…`);
    try {
      const res = await adminImportBankCSV(file);
      toast.success(
        `${res.imported} imported, ${res.skipped} skipped (duplicates)`,
        { id: t },
      );
      await invalidate();
      await qc.invalidateQueries({ queryKey: ["cbt", "bank", "subjects"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed", { id: t });
    }
  };

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  const total_qs = (subjects.data ?? []).reduce((n, s) => n + s.question_count, 0);

  return (
    <DashboardPage className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-dark">
            Curriculum
          </p>
          <h1 className="mt-2 font-display text-3xl text-deep">CBT bank</h1>
          <p className="mt-2 max-w-xl text-sm text-ink-600">
            {total_qs.toLocaleString()} published questions across{" "}
            {(subjects.data ?? []).length} subjects. Papers draw at random per
            student; drafts never appear in papers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> {showCreate ? "Close form" : "New question"}
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Upload size={15} /> Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importCSV(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {showCreate && (
        <CreateQuestionForm
          subjects={(subjects.data ?? []).map((s) => s.slug)}
          onDone={async () => {
            setShowCreate(false);
            await invalidate();
            await qc.invalidateQueries({ queryKey: ["cbt", "bank", "subjects"] });
          }}
        />
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-[--line] bg-white px-3 py-2 text-sm font-semibold text-deep"
        >
          <option value="">All subjects</option>
          {(subjects.data ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name} ({s.question_count})
            </option>
          ))}
        </select>
        {meta && (
          <span className="text-xs text-ink-400">
            {meta.total_items.toLocaleString()} questions · page {meta.page} of{" "}
            {meta.total_pages}
          </span>
        )}
      </div>

      {/* table */}
      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-[--line] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 uppercase text-primary-dark">
                      {q.subject_slug}
                    </span>
                    <span className="text-ink-400">{q.topic}</span>
                    <StatusBadge
                      label={q.status}
                      kind={q.status === "published" ? "success" : "neutral"}
                    />
                    <span className="text-ink-300">{q.source}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-ink-900">
                    {q.stem}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Key: {LETTERS[q.correct_index]} ·{" "}
                    {q.options[q.correct_index]?.slice(0, 50)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => void toggleStatus(q.id, q.status, q.stem)}
                    title={q.status === "published" ? "Move to draft" : "Publish"}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-[--line] text-ink-500 hover:border-primary/40 hover:text-primary-dark"
                  >
                    {q.status === "published" ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(q.id === confirmDelete ? null : q.id)}
                    title="Delete"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {confirmDelete === q.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm">
                  <span className="text-red-700">Delete this question permanently?</span>
                  <button onClick={() => void remove(q.id)} className="btn-primary text-xs">
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-semibold text-ink-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[--line] p-10 text-center text-sm text-ink-400">
              <BookOpenCheck size={24} className="mx-auto mb-2 text-ink-300" />
              No questions match this filter.
            </div>
          )}
        </div>
      )}

      {/* pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!meta.has_prev}
            className="btn-secondary inline-flex items-center gap-1 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs font-semibold text-ink-500">
            {meta.page} / {meta.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
            disabled={!meta.has_next}
            className="btn-secondary inline-flex items-center gap-1 text-sm disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </DashboardPage>
  );
}

function CreateQuestionForm({
  subjects,
  onDone,
}: {
  subjects: string[];
  onDone: () => Promise<void>;
}) {
  const [slug, setSlug] = useState(subjects[0] ?? "mathematics");
  const [form, setForm] = useState({
    topic: "",
    stem: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "A",
    explanation: "",
    difficulty: 2,
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const options = [form.optionA, form.optionB, form.optionC, form.optionD];
    if (!form.stem.trim() || options.filter((o) => o.trim()).length < 2) {
      toast.error("A stem and at least two non-empty options are required");
      return;
    }
    setSaving(true);
    try {
      await adminCreateBankQuestion({
        subject_slug: slug,
        topic: form.topic.trim() || "General",
        difficulty: form.difficulty,
        stem: form.stem.trim(),
        options,
        correct_index: LETTERS.indexOf(form.correct),
        explanation: form.explanation.trim(),
        source: "admin-authored",
      });
      toast.success("Question added to the bank");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create question");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-xl border border-[--line] bg-white px-3 py-2 text-sm text-ink-900 focus:border-primary focus:outline-none";

  return (
    <div className="rounded-3xl border border-[--line] bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-deep">Add a question</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className={input}>
          {[...new Set([...subjects, "mathematics", "english"])].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className={input}
          placeholder="Topic (e.g. Quadratic Equations)"
          value={form.topic}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />
        <textarea
          className={`${input} sm:col-span-2`}
          rows={2}
          placeholder="Question stem"
          value={form.stem}
          onChange={(e) => setForm({ ...form, stem: e.target.value })}
        />
        {(["optionA", "optionB", "optionC", "optionD"] as const).map((k, i) => (
          <div key={k} className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-bold text-ink-500">
              <input
                type="radio"
                name="key"
                checked={form.correct === LETTERS[i]}
                onChange={() => setForm({ ...form, correct: LETTERS[i] })}
              />
              {LETTERS[i]}
            </label>
            <input
              className={input}
              placeholder={`Option ${LETTERS[i]}`}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </div>
        ))}
        <textarea
          className={`${input} sm:col-span-2`}
          rows={2}
          placeholder="Explanation (shown in the student review)"
          value={form.explanation}
          onChange={(e) => setForm({ ...form, explanation: e.target.value })}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => void submit()} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save question"}
        </button>
        <span className="text-[11px] text-ink-400">
          Select the radio beside the CORRECT option — the key stays server-side.
        </span>
      </div>
    </div>
  );
}
