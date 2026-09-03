"use client";

import { useForm } from "@tanstack/react-form";
import { Stepper } from "@/components/ui/stepper";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Modal } from "@/components/ui/modal";
import { CheckCircle2, Clock, Search, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listSubjects, type Subject } from "@/features/subjects/api/list";
import {
  addSubject,
  createTutorProfile,
  listMySubjects,
  requestDocumentUpload,
  startAssessment,
  submitAssessment,
  type AnswerInput,
  type CreateProfileInput,
} from "@/features/vetting/api";
import type { TutorProfile } from "@/features/vetting/types";

// Shared step components for the stateful multi-page tutor onboarding
// (/become-tutor/apply → subjects → documents → assessment → status).

const profileSchema = z.object({
  display_name: z.string().min(2, "Full name is required"),
  headline: z.string().min(5, "A short headline helps parents understand your style"),
  bio: z.string().min(30, "Tell parents a little more (min 30 characters)"),
  years_experience: z.coerce.number().min(1, "At least 1 year of teaching experience"),
  hourly_rate_min: z.coerce.number().positive("Enter your hourly rate"),
  accepts_online: z.boolean(),
  accepts_in_person: z.boolean(),
});

export function OnboardingStepper({ current }: { current: number }) {
  // Reuses the shared Stepper (24.1) so the 5-page tutor flow matches the
  // NUVORA design system tokens.
  return <Stepper steps={["Profile", "Subjects", "Documents", "Quiz", "In review"]} current={current} className="mb-8" />;
}

export function ProfileStep({ onCreated }: { onCreated: (p: TutorProfile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      display_name: "", headline: "", bio: "", years_experience: 1,
      hourly_rate_min: 5000, accepts_online: true, accepts_in_person: false,
    },
    validators: {
      onSubmit: ({ value }) => {
        const res = profileSchema.safeParse(value);
        return res.success ? undefined : res.error.issues.map((i) => i.message).join("; ");
      },
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      setError(null);
      try {
        const input: CreateProfileInput = {
          display_name: value.display_name, headline: value.headline, bio: value.bio,
          years_experience: value.years_experience, hourly_rate_min: value.hourly_rate_min,
          currency: "NGN", timezone: "Africa/Lagos",
          accepts_online: value.accepts_online, accepts_in_person: value.accepts_in_person,
        };
        const p = await createTutorProfile(input);
        onCreated(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create profile");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); void form.handleSubmit(); }}
      className="border rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Tell us about yourself</h2>
      {(["display_name", "headline", "bio"] as const).map((field) => (
        <form.Field key={field} name={field}>
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium capitalize">{field.replace("_", " ")}</span>
              {field === "bio" ? (
                <textarea rows={4} value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur}
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
              ) : (
                <input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur}
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
              )}
              {f.state.meta.errors?.length ? <span className="mt-1 block text-xs text-red-600">{f.state.meta.errors.join(", ")}</span> : null}
            </label>
          )}
        </form.Field>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="years_experience">
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium">Years of experience</span>
              <input type="number" min={1} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
            </label>
          )}
        </form.Field>
        <form.Field name="hourly_rate_min">
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium">Hourly rate (₦)</span>
              <input type="number" min={1000} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
            </label>
          )}
        </form.Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="accepts_online">
          {(f) => (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.state.value} onChange={(e) => f.handleChange(e.target.checked)} /> Teaches online
            </label>
          )}
        </form.Field>
        <form.Field name="accepts_in_person">
          {(f) => (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.state.value} onChange={(e) => f.handleChange(e.target.checked)} /> Teaches in person
            </label>
          )}
        </form.Field>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Creating profile…" : "Create profile & continue"}
      </Button>
    </form>
  );
}

export function SubjectsStep({ profileId, onNext }: { profileId: string; onNext: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const subjects = useQuery({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      // page_size=100: the picker must show the FULL catalogue (default page
      // size is 20, which silently hid subjects beyond the first 20).
      const res = await listSubjects({ page: 1, page_size: 100 });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const id of selected) await addSubject(profileId, id);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subjects");
    } finally {
      setSaving(false);
    }
  };

  if (subjects.isLoading) {
    return <div className="border rounded-2xl p-6 space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="border rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">What can you teach?</h2>
      <p className="text-sm text-ink-600">Choose at least one subject - you can add more later.</p>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search subjects…"
        className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
      />
      <div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
        {(subjects.data ?? []).filter((s: Subject) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())).map((s: Subject) => (
          <button key={s.id} type="button" onClick={() => toggle(s.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              selected.has(s.id) ? "border-brand-blue bg-brand-blue/5 text-brand-blue font-semibold" : "border-ink-200 hover:border-ink-400"
            }`}>
            {s.name}
            <span className="block text-xs text-ink-400 font-normal">{s.category}</span>
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button variant="gold" size="lg" className="w-full" disabled={saving || selected.size === 0} onClick={save}>
        {saving ? "Saving…" : `Continue with ${selected.size} subject${selected.size === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}

export function DocumentsStep({ profileId, onNext }: { profileId: string; onNext: () => void }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const upload = async () => {
    if (files.length === 0) { setError("Choose at least one ID document first"); return; }
    setUploading(true);
    setError(null);
    try {
      for (const f of files) {
        const mime = f.file.type || f.type || "application/octet-stream";
        const res = await requestDocumentUpload(profileId, "GOVT_ID", f.name, mime, f.file.size);
        if (!res.upload_url) throw new Error("Upload URL was not generated");
        const uploadRes = await fetch(res.upload_url, {
          method: "PUT",
          headers: { "Content-Type": mime },
          body: f.file,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed for ${f.name}`);
      }
      setConfirmOpen(false);
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft space-y-4">
        <h2 className="text-xl font-bold text-brand-navy">Identity verification</h2>
        <p className="text-sm text-ink-600">
          Upload a government-issued ID (national ID, passport, or driver&apos;s licence). Files go to a{" "}
          <strong>private bucket</strong> - only you and our review team can access them, via signed URLs.
        </p>
        <FileUploader
          files={files}
          onChange={(f) => { setFiles(f); setError(null); }}
          accept=".pdf,.jpg,.jpeg,.png"
          maxFiles={3}
          hint="PDF, JPG or PNG · up to 3 files"
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button variant="gold" size="lg" className="w-full" disabled={files.length === 0} onClick={() => setConfirmOpen(true)}>
          Upload &amp; continue
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm upload"
        description="Your ID documents are submitted to the NUVORA review team."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="gold" disabled={uploading} onClick={() => void upload()}>
              {uploading ? "Uploading…" : "Confirm & submit"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-600">
          You are about to submit{" "}
          <strong>{files.length} document{files.length === 1 ? "" : "s"}</strong>:
        </p>
        <ul className="mt-3 space-y-1.5">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center gap-2 text-sm text-ink-700">
              <FileText size={14} className="text-brand-blue" aria-hidden="true" />
              {f.name}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-brand-gold-light px-4 py-3 text-xs text-ink-700">
          🛡️ Your documents are stored privately and only reviewed by the vetting team via signed URLs.
        </p>
      </Modal>
    </div>
  );
}

export function AssessmentStep({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const [attempt, setAttempt] = useState<Awaited<ReturnType<typeof startAssessment>> | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitAssessment>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mySubjects = useQuery({
    queryKey: ["vetting", "subjects", profileId],
    queryFn: () => listMySubjects(profileId),
    staleTime: 60_000,
  });

  const begin = async (subject: string) => {
    setBusy(true);
    setError(null);
    try {
      const a = await startAssessment(profileId, subject);
      setAttempt(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start quiz");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    try {
      const inputs: AnswerInput[] = attempt.questions.map((q) => ({ question_id: q.id, chosen_index: answers[q.id] ?? 0 }));
      const r = await submitAssessment(attempt.attempt.id, inputs);
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit quiz");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className={`border rounded-2xl p-8 text-center space-y-3 ${result.passed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="text-4xl">{result.passed ? "🎉" : "📚"}</div>
        <h2 className="text-xl font-bold">{result.passed ? "You passed!" : "Not quite this time"}</h2>
        <p className="text-sm text-ink-700">
          Score: <strong>{result.correct}/{result.total}</strong> ({Math.round((result.score / result.max_score) * 100)}%)
          {result.passed ? " - competency valid for 12 months." : " - you can retake once your profile is under review."}
        </p>
        <Button variant="gold" onClick={onDone}>Continue</Button>
      </div>
    );
  }

  if (attempt) {
    return (
      <div className="border rounded-2xl p-6 space-y-5">
        <h2 className="text-xl font-bold">Competency quiz</h2>
        <p className="text-xs text-ink-500">You have 30 minutes. Pass mark: {Math.round(attempt.pass_threshold * 100)}%.</p>
        {attempt.questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-semibold">{i + 1}. {q.question}</p>
            <div className="space-y-1">
              {q.options.map((opt, idx) => (
                <label key={idx} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                  <input type="radio" name={q.id} checked={answers[q.id] === idx}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))} />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button variant="gold" size="lg" className="w-full" disabled={busy || Object.keys(answers).length < attempt.questions.length} onClick={submit}>
          {busy ? "Submitting…" : "Submit answers"}
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Competency assessment</h2>
      <p className="text-sm text-ink-600">Pick a subject from your teaching scope - 5 questions, 30 minutes, 70% to pass.</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {(mySubjects.data ?? []).map((s) => (
          <button key={s.subject_id} type="button" disabled={busy} onClick={() => begin(s.subject_id)}
            className="rounded-xl border border-ink-200 px-4 py-3 text-sm hover:border-brand-blue transition-colors disabled:opacity-50">
            {s.name}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function SubmittedState({ profile }: { profile: TutorProfile }) {
  const statusCopy: Record<string, { label: string; hint: string }> = {
    DRAFT: { label: "Draft", hint: "Finish your application to submit for review." },
    SUBMITTED: { label: "Submitted", hint: "Our team will review your application shortly." },
    UNDER_REVIEW: { label: "Under review", hint: "We are checking your credentials and documents." },
    INTERVIEW: { label: "Interview scheduled", hint: "Our team will reach out to schedule your interview." },
    VERIFICATION: { label: "Verification", hint: "Final identity checks in progress." },
    APPROVED: { label: "Approved", hint: "You are live on the marketplace. Bookings can come in now." },
    REJECTED: { label: "Not approved", hint: "Our team will contact you with next steps." },
    HOLD: { label: "On hold", hint: "Your application is paused - we will be in touch." },
    SUSPENDED: { label: "Suspended", hint: "Contact support for details." },
  };
  const st = statusCopy[profile.status] ?? { label: profile.status, hint: "" };

  return (
    <div className="border rounded-2xl p-8 text-center space-y-3">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-gold-light">
        {profile.status === "APPROVED"
          ? <CheckCircle2 size={26} className="text-brand-green" />
          : <Clock size={26} className="text-brand-navy" />}
      </div>
      <h2 className="text-xl font-bold">Application {st.label}</h2>
      <p className="text-sm text-ink-600">{st.hint}</p>
      <p className="text-xs text-ink-400">
        Profile: {profile.display_name} · {profile.slug} · ranking {profile.ranking_score.toFixed(1)}
      </p>
      {profile.status === "APPROVED" && (
        <a href={`/tutors/${profile.slug}`} className="inline-block rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 transition hover:bg-brand-gold-hover">View your public profile</a>
      )}
    </div>
  );
}
