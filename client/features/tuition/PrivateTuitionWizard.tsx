"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { Stepper } from "@/components/ui/stepper";
import { listLearners } from "@/features/onboarding/api";
import { listSubjects } from "@/features/subjects/api/list";
import { createPrivateTuitionRequest } from "@/features/tuition/api";

const FLOAT_INPUT =
  "peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 " +
  "placeholder:text-transparent focus:border-brand-gold focus:ring-brand-gold " +
  "focus:pt-6 focus:pb-2 not-placeholder-shown:pt-6 not-placeholder-shown:pb-2 " +
  "focus:outline-none transition-colors";
const FLOAT_LABEL =
  "absolute top-0 inset-x-0 p-3 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 " +
  "border border-transparent origin-top-left text-ink-800 " +
  "peer-focus:scale-90 peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:text-ink-500 " +
  "peer-not-placeholder-shown:scale-90 peer-not-placeholder-shown:translate-x-0.5 " +
  "peer-not-placeholder-shown:-translate-y-1.5 peer-not-placeholder-shown:text-ink-500";

// 7-step private tuition request (per the YK-Virtual working document §8.7).
// Submits a structured request via the support pipeline; our advisors match
// the learner with a vetted tutor (managed matching, Tuteria-style fallback).

const STEPS: string[] = [
  "Learner & level",
  "Subject",
  "Goals",
  "Schedule",
  "Tutor preference",
  "Contact",
  "Review",
] as const;

const LEVELS = [
  "Year 7-9 (British)",
  "IGCSE (Year 10-11)",
  "A-Level (Year 12-13)",
  "JSS1-3 (Nigerian)",
  "SSS1-3 (Nigerian)",
  "Other",
];
const SUBJECTS = [
  "Mathematics",
  "English Language",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Python Programming",
  "Economics",
  "Other",
];
const DAYS = ["Weekdays", "Weekends", "Both"];
const TIMES = [
  "Morning (8am-12pm)",
  "Afternoon (12-4pm)",
  "Evening (4-8pm)",
  "Flexible",
];

type FormState = {
  learnerName: string;
  level: string;
  subject: string;
  goals: string;
  days: string;
  time: string;
  timezone: string;
  tutorPreference: string;
  email: string;
  phone: string;
};

const EMPTY: FormState = {
  learnerName: "",
  level: "",
  subject: "",
  goals: "",
  days: "",
  time: "",
  timezone: "Africa/Lagos",
  tutorPreference: "No preference - match me",
  email: "",
  phone: "",
};

export function PrivateTuitionWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { user } = useSession();

  // For logged-in parents we create a real matching request (request →
  // match → pay → escrow). We need their linked learner + a subject id.
  const learners = useQuery({
    queryKey: ["onboarding", "learners"],
    queryFn: listLearners,
    enabled: !!user,
    staleTime: 30_000,
  });
  const subjects = useQuery({
    queryKey: ["subjects", "catalogue"],
    queryFn: () => listSubjects(),
    staleTime: 300_000,
  });

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    switch (step) {
      case 0:
        return form.learnerName.trim() !== "" && form.level !== "";
      case 1:
        return form.subject !== "";
      case 2:
        return form.goals.trim().length >= 10;
      case 3:
        return form.days !== "" && form.time !== "";
      case 5:
        return (user?.email ?? form.email).includes("@");
      default:
        return true;
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Logged-in parents with a linked learner create a REAL request through
      // the booking engine (managed matching → admin assigns a tutor → pay).
      const myLearners = learners.data ?? [];
      const subjectId = (subjects.data?.data ?? []).find(
        (s) => s.name.toLowerCase() === form.subject.toLowerCase(),
      )?.id;

      if (user && myLearners.length > 0 && subjectId) {
        await createPrivateTuitionRequest({
          student_id: myLearners[0].id,
          subject_id: subjectId,
          goals: form.goals,
          preferred_days: form.days,
          preferred_time: form.time,
          timezone: form.timezone,
          location_mode: "ONLINE",
        });
        setDone(true);
        toast.success("Request received — matching in progress", {
          description:
            "An advisor will match a vetted tutor, then you'll pay securely (escrow-protected).",
        });
        return;
      }

      // Otherwise fall back to a support ticket (anonymous / no linked learner).
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/support/tickets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user?.email ?? form.email,
            subject: `Private tuition request - ${form.subject} (${form.level})`,
            message: [
              `Learner: ${form.learnerName}`,
              `Level: ${form.level}`,
              `Subject: ${form.subject}`,
              `Goals: ${form.goals}`,
              `Preferred: ${form.days} · ${form.time} · ${form.timezone}`,
              `Tutor preference: ${form.tutorPreference}`,
              `Contact: ${form.email} ${form.phone ? "/ " + form.phone : ""}`,
            ].join("\n"),
          }),
        },
      );
      if (!res.ok) throw new Error("request failed");
      setDone(true);
      toast.success("Request received", {
        description:
          "Our advisors will match you with a vetted tutor within 24 hours.",
      });
    } catch {
      toast.error("Could not send request", {
        description:
          "Please try again or email us directly from the contact page.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="border rounded-2xl p-10 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h2 className="text-2xl font-extrabold">Request received!</h2>
        <p className="text-ink-600 text-sm max-w-md mx-auto">
          Our team will match {form.learnerName} with a vetted {form.subject}{" "}
          tutor and reach out to <strong>{user?.email ?? form.email}</strong>{" "}
          within 24 hours with a proposed schedule and quote.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setForm(EMPTY);
            setStep(0);
            setDone(false);
          }}
        >
          Submit another request
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-6 md:p-8">
      {/* Stepper (shared §24.1 component) */}
      <Stepper steps={STEPS} current={step} className="mb-8" />

      <div className="min-h-[260px]">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Who is this for?
            </h2>
            <div className="relative">
              <input
                id="wiz-learner"
                type="text"
                className={FLOAT_INPUT}
                placeholder="Ada Bello"
                value={form.learnerName}
                onChange={(e) => set("learnerName", e.target.value)}
              />
              <label htmlFor="wiz-learner" className={FLOAT_LABEL}>
                Learner&apos;s name
              </label>
            </div>
            <div>
              <span className="text-sm font-medium">Current level</span>
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set("level", l)}
                    className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${form.level === l ? "border-brand-gold bg-brand-gold-light font-semibold" : "hover:border-ink-400"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Which subject?
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("subject", s)}
                  className={`rounded-xl border px-4 py-2.5 text-sm transition-colors ${form.subject === s ? "border-brand-gold bg-brand-gold-light font-semibold" : "hover:border-ink-400"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Goals & challenges
            </h2>
            <label className="block text-sm">
              <span className="font-medium">
                What would you like to achieve? (min 10 characters)
              </span>
              <textarea
                rows={4}
                value={form.goals}
                onChange={(e) => set("goals", e.target.value)}
                placeholder="e.g. Improve from C to A in IGCSE Mathematics before the November exams…"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Preferred schedule
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-medium">Days</span>
                <div className="mt-2 space-y-2">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set("days", d)}
                      className={`block w-full rounded-xl border px-4 py-2.5 text-sm text-left ${form.days === d ? "border-brand-gold bg-brand-gold-light font-semibold" : "hover:border-ink-400"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Time of day</span>
                <div className="mt-2 space-y-2">
                  {TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("time", t)}
                      className={`block w-full rounded-xl border px-4 py-2.5 text-sm text-left ${form.time === t ? "border-brand-gold bg-brand-gold-light font-semibold" : "hover:border-ink-400"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Timezone</span>
              <input
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Tutor preference (optional)
            </h2>
            {[
              "No preference - match me",
              "Female tutor",
              "Male tutor",
              "Specific tutor (I'll name them)",
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("tutorPreference", t)}
                className={`block w-full rounded-xl border px-4 py-3 text-sm text-left ${form.tutorPreference === t ? "border-brand-gold bg-brand-gold-light font-semibold" : "hover:border-ink-400"}`}
              >
                {t}
              </button>
            ))}
            <LinkToTutors />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Where should we reach you?
            </h2>
            {!user && (
              <label className="block text-sm font-medium text-ink-800">
                Email
                <input
                  type="email"
                  id="wiz-email"
                  className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm placeholder:text-ink-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
                  placeholder="parent@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>
            )}
            {user && (
              <p className="text-sm text-ink-500">
                We&apos;ll use your account email: <strong>{user.email}</strong>
              </p>
            )}
            <label className="block text-sm">
              <span className="font-medium">Phone / WhatsApp (optional)</span>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+234…"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none"
              />
            </label>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="font-display text-xl tracking-[0.02em] text-brand-navy">
              Review your request
            </h2>
            <dl className="rounded-xl bg-ink-50 p-5 text-sm space-y-2">
              <SummaryRow k="Learner" v={form.learnerName} />
              <SummaryRow k="Level" v={form.level} />
              <SummaryRow k="Subject" v={form.subject} />
              <SummaryRow k="Goals" v={form.goals} />
              <SummaryRow
                k="Schedule"
                v={`${form.days} · ${form.time} · ${form.timezone}`}
              />
              <SummaryRow k="Tutor" v={form.tutorPreference} />
              <SummaryRow k="Contact" v={user?.email ?? form.email} />
            </dl>
            <p className="text-xs text-ink-400">
              Submitting creates a request ticket - our advisors match you with
              a vetted tutor and agree the price before any payment
              (escrow-protected).
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            variant="gold"
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="gold"
            onClick={() => void submit()}
            disabled={submitting || !canNext()}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-ink-400 font-medium">{k}</dt>
      <dd className="text-ink-800">{v}</dd>
    </div>
  );
}

function LinkToTutors() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <a
      href="/tutors"
      className="text-sm text-brand-blue font-semibold hover:underline"
    >
      Browse tutors on the marketplace →
    </a>
  );
}
