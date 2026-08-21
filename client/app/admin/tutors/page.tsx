"use client";

// Admin tutor console — create/edit vetted tutors without touching the
// database. Create accounts with a password, fill the profile, approve +
// publish immediately, and attach teaching subjects.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { listVettingQueue, type TutorProfile } from "@/features/vetting/api";
import { StatusBadge, statusKindFor } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

const INPUT_CLS =
  "mt-1 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

type SubjectOption = { id: string; name: string; slug: string };

export default function AdminTutorsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    headline: "",
    bio: "",
    years_experience: "3",
    hourly_rate_min: "",
    hourly_rate_max: "",
    approve: true,
  });
  const [subjects, setSubjects] = useState<string[]>([]);

  const tutors = useQuery({
    queryKey: ["admin", "tutors"],
    queryFn: () => apiFetch<TutorProfile[]>("/admin/tutors").then((r) => r.data ?? []),
    staleTime: 15_000,
  });

  const subjectsQ = useQuery({
    queryKey: ["catalogue", "subjects"],
    queryFn: () => apiFetch<SubjectOption[]>("/subjects?page_size=100").then((r) => r.data ?? []),
    staleTime: 5 * 60_000,
  });

  const toggleSubject = (slug: string) => {
    setSubjects((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  };

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email for the tutor account.");
      return;
    }
    if (!form.display_name.trim()) {
      setError("Display name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/admin/tutors", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password || undefined,
          display_name: form.display_name.trim(),
          headline: form.headline.trim() || undefined,
          bio: form.bio.trim() || undefined,
          years_experience: Number(form.years_experience) || 0,
          hourly_rate_min: form.hourly_rate_min ? Number(form.hourly_rate_min) : undefined,
          hourly_rate_max: form.hourly_rate_max ? Number(form.hourly_rate_max) : undefined,
          approve: form.approve,
          subject_slugs: subjects,
        }),
      });
      toast.success(form.approve ? "Vetted tutor created — approved, public and ready to assign" : "Tutor created (DRAFT)");
      await qc.invalidateQueries({ queryKey: ["admin", "tutors"] });
      setCreating(false);
      setForm({
        email: "", password: "", display_name: "", headline: "", bio: "",
        years_experience: "3", hourly_rate_min: "", hourly_rate_max: "", approve: true,
      });
      setSubjects([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the tutor");
    } finally {
      setBusy(false);
    }
  };

  const togglePublic = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      apiFetch(`/admin/vetting/profiles/${id}/public`, {
        method: "POST",
        body: JSON.stringify({ is_public: isPublic }),
      }),
    onSuccess: () => {
      toast.success("Visibility updated");
      qc.invalidateQueries({ queryKey: ["admin", "tutors"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update visibility"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-deep">
            <BadgeCheck className="text-primary" /> Tutors
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Create vetted tutors from here — account, profile, approval and subjects in one step. No database access needed.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-ink-900 transition-colors hover:bg-primary-hover"
        >
          <Plus size={15} /> Add tutor
        </button>
      </div>

      {tutors.isLoading ? (
        <p className="text-sm text-ink-500">Loading tutors…</p>
      ) : (tutors.data ?? []).length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20} />}
          title="No approved tutors yet"
          description="Create your first vetted tutor — they can be assigned to cohorts straight away."
        />
      ) : (
        <ul className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft">
          {(tutors.data ?? []).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-bold text-ink-800">{t.display_name}</p>
                <p className="text-xs text-ink-500">
                  {t.slug} · {t.years_experience} years
                  {t.hourly_rate_min ? ` · ₦${t.hourly_rate_min.toLocaleString()}/hr` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={t.status} kind={statusKindFor(t.status)} />
                <button
                  type="button"
                  onClick={() => togglePublic.mutate({ id: t.id, isPublic: !t.is_public })}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${
                    t.is_public
                      ? "border border-ink-200 text-ink-600 hover:bg-ink-50"
                      : "border border-primary text-primary-dark hover:bg-primary-light"
                  }`}
                >
                  {t.is_public ? "Hide from marketplace" : "Make public"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Add a tutor">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Email *</span>
              <input
                autoFocus
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tutor@example.com"
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">
                Password {form.email && "— required for a new account"}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="min 8 chars, letter + number"
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Display name *</span>
              <input
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="e.g. Adaeze Okonkwo"
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Headline</span>
              <input
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="e.g. Mathematics · UTME"
                className={INPUT_CLS}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-ink-700">Bio</span>
            <textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Experience, style, results…"
              className={`${INPUT_CLS} resize-y`}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Years experience</span>
              <input
                type="number"
                min="0"
                max="80"
                value={form.years_experience}
                onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Rate from (₦/hr)</span>
              <input
                type="number"
                min="0"
                value={form.hourly_rate_min}
                onChange={(e) => setForm({ ...form, hourly_rate_min: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-ink-700">Rate to (₦/hr)</span>
              <input
                type="number"
                min="0"
                value={form.hourly_rate_max}
                onChange={(e) => setForm({ ...form, hourly_rate_max: e.target.value })}
                className={INPUT_CLS}
              />
            </label>
          </div>

          <div>
            <span className="font-medium text-ink-700">Teaching subjects</span>
            <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {(subjectsQ.data ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={subjects.includes(s.slug)}
                  onClick={() => toggleSubject(s.slug)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    subjects.includes(s.slug)
                      ? "bg-primary text-ink-900"
                      : "border border-ink-200 text-ink-600 hover:border-ink-300"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-primary bg-primary-light p-3">
            <input
              type="checkbox"
              checked={form.approve}
              onChange={(e) => setForm({ ...form, approve: e.target.checked })}
              className="size-4 accent-primary"
            />
            <span className="text-sm font-semibold text-deep">
              Approve immediately (vetted tutor — public in the marketplace)
            </span>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-ink-900 disabled:opacity-50"
            >
              {busy ? "Saving…" : form.approve ? "Create vetted tutor" : "Create tutor (DRAFT)"}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-ink-200 px-4 text-sm font-semibold text-ink-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
