"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { listSubjects, type Subject } from "@/features/subjects/api/list";
import {
  addSubject,
  createTutorProfile,
  getMyProfile,
  listMySubjects,
  requestDocumentUpload,
  startAssessment,
  submitAssessment,
  submitForReview,
  type AnswerInput,
  type CreateProfileInput,
} from "@/features/vetting/api";
import type { TutorProfile } from "@/features/vetting/types";

// Dev auth bridge — replaced by session auth in Phase 7. This constant is
// overridable via query string (?user=…) for local demo.
const DEV_USER = "00000000-0000-0000-0000-0000000000a1";

const profileSchema = z.object({
  display_name: z.string().min(2, "Full name is required"),
  headline: z.string().min(5, "A short headline helps parents understand your style"),
  bio: z.string().min(30, "Tell parents a little more (min 30 characters)"),
  years_experience: z.coerce.number().min(1, "At least 1 year of teaching experience"),
  hourly_rate_min: z.coerce.number().positive("Enter your hourly rate"),
  accepts_online: z.boolean(),
  accepts_in_person: z.boolean(),
});

type Step = "profile" | "subjects" | "documents" | "assessment" | "submitted";

export function BecomeTutorClient() {
  const [step, setStep] = useState<Step>("profile");
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      const u = new URLSearchParams(window.location.search).get("user");
      if (u) return u;
    }
    return DEV_USER;
  });

  // If the tutor already has a profile, jump straight to its status.
  useQuery({
    queryKey: ["vetting", "me", userId],
    queryFn: async () => {
      const p = await getMyProfile(userId);
      if (p) {
        setProfile(p);
        setStep(p.status === "DRAFT" ? "subjects" : "submitted");
      }
      return p;
    },
    staleTime: 30_000,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <Stepper step={step} />
      {step === "profile" && (
        <ProfileStep
          userId={userId}
          onCreated={(p) => {
            setProfile(p);
            setStep("subjects");
          }}
        />
      )}
      {step === "subjects" && profile && (
        <SubjectsStep userId={userId} profileId={profile.id} onNext={() => setStep("documents")} />
      )}
      {step === "documents" && profile && (
        <DocumentsStep userId={userId} profileId={profile.id} onNext={() => setStep("assessment")} />
      )}
      {step === "assessment" && profile && (
        <AssessmentStep
          userId={userId}
          profileId={profile.id}
          onDone={() => setStep("submitted")}
        />
      )}
      {step === "submitted" && profile && <SubmittedState userId={userId} profile={profile} />}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const order: Step[] = ["profile", "subjects", "documents", "assessment", "submitted"];
  const labels: Record<Step, string> = {
    profile: "Profile",
    subjects: "Subjects",
    documents: "Documents",
    assessment: "Quiz",
    submitted: "In review",
  };
  const idx = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2 text-xs mb-8 flex-wrap">
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
              i <= idx ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-400"
            }`}
          >
            {i + 1}
          </span>
          <span className={i <= idx ? "font-semibold text-ink-800" : "text-ink-400"}>{labels[s]}</span>
          {i < order.length - 1 && <span className="w-4 h-px bg-ink-200" />}
        </li>
      ))}
    </ol>
  );
}

// --- Step 1: profile (TanStack Form + Zod) ---

function ProfileStep({ userId, onCreated }: { userId: string; onCreated: (p: TutorProfile) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      display_name: "",
      headline: "",
      bio: "",
      years_experience: 1,
      hourly_rate_min: 5000,
      accepts_online: true,
      accepts_in_person: false,
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
          display_name: value.display_name,
          headline: value.headline,
          bio: value.bio,
          years_experience: value.years_experience,
          hourly_rate_min: value.hourly_rate_min,
          currency: "NGN",
          timezone: "Africa/Lagos",
          accepts_online: value.accepts_online,
          accepts_in_person: value.accepts_in_person,
        };
        const p = await createTutorProfile(userId, input);
        onCreated(p);
        toast.success("Profile created — let's add your subjects");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create profile");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
      className="border rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-xl font-bold">Tell us about yourself</h2>
      {(["display_name", "headline", "bio"] as const).map((field) => (
        <form.Field key={field} name={field}>
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium capitalize">{field.replace("_", " ")}</span>
              {field === "bio" ? (
                <textarea
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  onBlur={f.handleBlur}
                />
              ) : (
                <input
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                  value={f.state.value}
                  onChange={(e) => f.handleChange(e.target.value)}
                  onBlur={f.handleBlur}
                />
              )}
              {f.state.meta.errors?.length ? (
                <span className="mt-1 block text-xs text-red-600">{f.state.meta.errors.join(", ")}</span>
              ) : null}
            </label>
          )}
        </form.Field>
      ))}
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="years_experience">
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium">Years of experience</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                value={f.state.value}
                onChange={(e) => f.handleChange(Number(e.target.value))}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="hourly_rate_min">
          {(f) => (
            <label className="block text-sm">
              <span className="font-medium">Hourly rate (₦)</span>
              <input
                type="number"
                min={1000}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
                value={f.state.value}
                onChange={(e) => f.handleChange(Number(e.target.value))}
              />
            </label>
          )}
        </form.Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="accepts_online">
          {(f) => (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.state.value} onChange={(e) => f.handleChange(e.target.checked)} />
              Teaches online
            </label>
          )}
        </form.Field>
        <form.Field name="accepts_in_person">
          {(f) => (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.state.value} onChange={(e) => f.handleChange(e.target.checked)} />
              Teaches in person
            </label>
          )}
        </form.Field>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Creating profile…" : "Continue to subjects"}
      </Button>
    </form>
  );
}

// --- Step 2: subjects ---

function SubjectsStep({
  userId,
  profileId,
  onNext,
}: {
  userId: string;
  profileId: string;
  onNext: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjects = useQuery({
    queryKey: ["subjects", "all"],
    queryFn: async () => {
      const res = await listSubjects({ page: 1 });
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const id of selected) {
        await addSubject(userId, profileId, id);
      }
      onNext();
      toast.success("Subjects saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subjects");
    } finally {
      setSaving(false);
    }
  };

  if (subjects.isLoading) {
    return (
      <div className="border rounded-2xl p-6 space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="border rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">What can you teach?</h2>
      <p className="text-sm text-ink-600">Choose at least one subject — you can add more later.</p>
      <div className="grid sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-1">
        {(subjects.data ?? []).map((s: Subject) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              selected.has(s.id)
                ? "border-brand-blue bg-brand-blue/5 text-brand-blue font-semibold"
                : "border-ink-200 hover:border-ink-400"
            }`}
          >
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

// --- Step 3: documents (identity first) ---

function DocumentsStep({
  userId,
  profileId,
  onNext,
}: {
  userId: string;
  profileId: string;
  onNext: () => void;
}) {
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!fileName.trim()) {
      setError("Choose an ID document file first");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await requestDocumentUpload(userId, profileId, "GOVT_ID", fileName.trim(), "application/pdf");
      // Dev: the signed URL is a local token URL; production uploads PUT to S3.
      if (res.upload_url) {
        try {
          await fetch(res.upload_url, { method: "PUT", body: new Blob([`dev-upload:${fileName}`]) });
        } catch {
          // ignore dev upload failures — the document row is what matters
        }
      }
      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Identity verification</h2>
      <p className="text-sm text-ink-600">
        Upload a government-issued ID (national ID, passport, or driver&apos;s licence). Files go to a{" "}
        <strong>private bucket</strong> — only you and our review team can access them, via signed URLs.
      </p>
      <input
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        placeholder="e.g. national-id.pdf"
        className="w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button variant="gold" size="lg" className="w-full" disabled={uploading} onClick={upload}>
        {uploading ? "Uploading…" : "Upload ID & continue"}
      </Button>
    </div>
  );
}

// --- Step 4: competency quiz ---

function AssessmentStep({
  userId,
  profileId,
  onDone,
}: {
  userId: string;
  profileId: string;
  onDone: () => void;
}) {
  const [attempt, setAttempt] = useState<Awaited<ReturnType<typeof startAssessment>> | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitAssessment>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mySubjects = useQuery({
    queryKey: ["vetting", "subjects", profileId],
    queryFn: () => listMySubjects(userId, profileId),
    staleTime: 60_000,
  });

  const begin = async (subject: string) => {
    setBusy(true);
    setError(null);
    try {
      const a = await startAssessment(userId, profileId, subject);
      setSubjectId(subject);
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
      const inputs: AnswerInput[] = attempt.questions.map((q) => ({
        question_id: q.id,
        chosen_index: answers[q.id] ?? 0,
      }));
      const r = await submitAssessment(userId, attempt.attempt.id, inputs);
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
          {result.passed ? " — competency valid for 12 months." : " — you can retake once your profile is under review."}
        </p>
        <Button variant="gold" onClick={onDone}>Continue</Button>
      </div>
    );
  }

  if (attempt) {
    return (
      <div className="border rounded-2xl p-6 space-y-5">
        <h2 className="text-xl font-bold">Competency quiz</h2>
        <p className="text-xs text-ink-500">
          You have 30 minutes. Pass mark: {Math.round(attempt.pass_threshold * 100)}%.
        </p>
        {attempt.questions.map((q: { id: string; question: string; options: string[] }, i: number) => (
          <div key={q.id} className="rounded-xl border p-4 space-y-2">
            <p className="text-sm font-semibold">
              {i + 1}. {q.question}
            </p>
            <div className="space-y-1">
              {q.options.map((opt: string, idx: number) => (
                <label key={idx} className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === idx}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                  />
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
      <p className="text-sm text-ink-600">
        Pick a subject from your teaching scope to start the quiz — 5 questions, 30 minutes, 70% to pass.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {(mySubjects.data ?? []).map((s: { subject_id: string; name: string }) => (
          <button
            key={s.subject_id}
            type="button"
            disabled={busy}
            onClick={() => begin(s.subject_id)}
            className="rounded-xl border border-ink-200 px-4 py-3 text-sm hover:border-brand-blue transition-colors disabled:opacity-50"
          >
            {s.name}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

// --- Submitted / status state ---

function SubmittedState({ userId, profile }: { userId: string; profile: TutorProfile }) {
  const statusCopy: Record<string, { label: string; hint: string }> = {
    DRAFT: { label: "Draft", hint: "Finish your application to submit for review." },
    SUBMITTED: { label: "Submitted", hint: "Our team will review your application shortly." },
    UNDER_REVIEW: { label: "Under review", hint: "We are checking your credentials and documents." },
    INTERVIEW: { label: "Interview scheduled", hint: "Our team will reach out to schedule your interview." },
    VERIFICATION: { label: "Verification", hint: "Final identity checks in progress." },
    APPROVED: { label: "Approved 🎉", hint: "You are live on the marketplace. Bookings can come in now." },
    REJECTED: { label: "Not approved", hint: "Our team will contact you with next steps." },
    HOLD: { label: "On hold", hint: "Your application is paused — we will be in touch." },
    SUSPENDED: { label: "Suspended", hint: "Contact support for details." },
  };
  const st = statusCopy[profile.status] ?? { label: profile.status, hint: "" };

  return (
    <div className="border rounded-2xl p-8 text-center space-y-3">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10 text-2xl">
        {profile.status === "APPROVED" ? "✅" : "🕓"}
      </div>
      <h2 className="text-xl font-bold">Application {st.label}</h2>
      <p className="text-sm text-ink-600">{st.hint}</p>
      <p className="text-xs text-ink-400">
        Profile: {profile.display_name} · {profile.slug} · ranking {profile.ranking_score.toFixed(1)}
      </p>
      {profile.status === "APPROVED" ? (
        <a href={`/tutors/${profile.slug}`} className="inline-block btn-gold">
          View your public profile
        </a>
      ) : (
        <Button variant="outline" onClick={() => submitForReview(userId, profile.id)}>
          {profile.status === "DRAFT" ? "Submit for review" : "Refresh status"}
        </Button>
      )}
    </div>
  );
}
