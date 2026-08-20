"use client";

// First-time 3-page wizard (G6 polish): after login, new users walk
// Welcome → Profile setup → Goals, then land on their role dashboard.
// Idempotent: completing it POSTs /auth/me/onboarded; returning users
// with the flag set are redirected straight through.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { markOnboarded } from "@/features/auth/api";
import { createLearner, ensureOwnLearner } from "@/features/onboarding/api";
import { homeForRoles } from "@/hooks/useDashboardRoute";
import { safeNextPath, withNext } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";

const GOALS = [
  { id: "exams", label: "Exam success (UTME · IGCSE · WAEC)", icon: "📝" },
  { id: "grades", label: "Better school grades", icon: "📈" },
  { id: "confidence", label: "Confidence & study habits", icon: "💪" },
  { id: "abroad", label: "Studying abroad", icon: "✈️" },
  { id: "digital", label: "Digital & tech skills", icon: "💻" },
];

function WizardInner() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const sp = useSearchParams();
  const next = safeNextPath(sp.get("next"));
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [level, setLevel] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const isParent = !!user?.roles.includes("PARENT");
  const isStudent = !!user?.roles.includes("STUDENT");
  const isTutor = !!user?.roles.includes("TUTOR");

  // Returning users skip the wizard entirely.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(withNext("/login", next));
      return;
    }
    if (user.onboarded) router.replace(next ?? homeForRoles(user.roles));
  }, [user, isLoading, router, next]);

  const complete = useMutation({
    mutationFn: markOnboarded,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("You're all set - welcome to NUVORA!");
      router.replace(next ?? homeForRoles(user?.roles ?? []));
    },
    onError: () => toast.error("Could not save - please try again"),
  });

  const finish = async () => {
    try {
      if (isParent && firstName.trim()) {
        await createLearner({
          first_name: firstName.trim(),
          last_name: user?.last_name || "Learner",
          current_level: level || undefined,
          relationship: "PARENT",
        });
      }
      if (isStudent) {
        await ensureOwnLearner({
          first_name: (user?.first_name || firstName || user?.email.split("@")[0] || "Learner").trim(),
          last_name: (user?.last_name || "NUVORA").trim(),
          current_level: level || undefined,
        });
      }
    } catch {
      // learner creation is best-effort; the wizard must never trap the user
    }
    setSaving(true);
    complete.mutate();
  };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-surface" />;
  }

  const roleLabel = isTutor ? "tutor" : isStudent ? "learner" : "parent";
  const levels = ["Primary", "JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3", "IGCSE", "A Level"];

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-ink-200 bg-white p-8 shadow-card">
        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-8" aria-label="Wizard progress">
          {["Welcome", isParent ? "Your learner" : isStudent ? "Your level" : "Your subjects", "Goals"].map((label, i) => (
            <li key={label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand-gold" : "bg-ink-100"}`} />
              <p className={`mt-2 text-[11px] font-bold uppercase tracking-wide ${i <= step ? "text-ink-900" : "text-ink-400"}`}>
                {i + 1}. {label}
              </p>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section>
            <p className="tag-handwritten mb-2">Welcome</p>
            <h1 className="font-display text-3xl text-brand-navy">Let&apos;s set you up, {user.first_name || user.email.split("@")[0]}</h1>
            <p className="mt-3 text-sm text-ink-600 leading-relaxed">
              You&apos;re signed in as a <strong>{roleLabel}</strong>. In two quick steps we&apos;ll
              personalise your dashboard, recommendations and notifications.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <Link href="/onboarding?step=3" className="text-sm font-semibold text-brand-navy hover:underline">
                Choose a different role
              </Link>
              <Button onClick={() => setStep(1)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 1 && isParent && (
          <section>
            <h2 className="font-display text-2xl text-brand-navy">Add your first learner</h2>
            <p className="mt-2 text-sm text-ink-600">We use their level to recommend cohorts, programmes and tutors.</p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-ink-500">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Kemi"
              className="mt-2 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30"
            />
            <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink-500">Current level</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {levels.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    level === l ? "bg-brand-gold text-ink-900" : "border border-ink-200 text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!firstName.trim()}>Continue</Button>
            </div>
          </section>
        )}

        {step === 1 && isStudent && (
          <section>
            <h2 className="font-display text-2xl text-brand-navy">What level are you at?</h2>
            <p className="mt-2 text-sm text-ink-600">Recommendations and quizzes tune to your level.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {levels.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    level === l ? "bg-brand-gold text-ink-900" : "border border-ink-200 text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 1 && isTutor && (
          <section>
            <h2 className="font-display text-2xl text-brand-navy">What do you teach?</h2>
            <p className="mt-2 text-sm text-ink-600">
              You&apos;ll pick subjects during vetting - for now, tell us your strongest area so we can
              order your onboarding.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Mathematics", "English", "Sciences", "Computer Science", "Exam Prep"].map((s) => (
                <button
                  key={s}
                  onClick={() => setLevel(s)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                    level === s ? "bg-brand-gold text-ink-900" : "border border-ink-200 text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 1 && !isParent && !isStudent && !isTutor && (
          <section>
            <h2 className="font-display text-2xl text-brand-navy">Almost there</h2>
            <p className="mt-2 text-sm text-ink-600">
              Your admin console is ready - pick your goals to finish setup.
            </p>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>Continue</Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="font-display text-2xl text-brand-navy">What are your goals?</h2>
            <p className="mt-2 text-sm text-ink-600">Pick as many as you like - they shape your “For you” feed.</p>
            <div className="mt-6 space-y-2">
              {GOALS.map((g) => {
                const active = goals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setGoals((prev) => (active ? prev.filter((x) => x !== g.id) : [...prev, g.id]))
                    }
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      active ? "border-brand-gold bg-brand-gold/10 text-ink-900" : "border-ink-200 text-ink-600 hover:bg-ink-50"
                    }`}
                  >
                    <span aria-hidden>{g.icon}</span> {g.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => void finish()} disabled={saving}>
                {saving ? "Saving…" : "Finish - take me to my dashboard"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <WizardInner />
    </Suspense>
  );
}
