"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/layout/AuthShell";
import { useSession } from "@/hooks/useSession";

// Onboarding — role selection (stateful, role-specific next steps).
// /register → /onboarding (this) → role step (learner profile for parent/
// student, tutor application for tutors). Choice is stored so the flow
// survives refreshes.

const ROLES = [
  { value: "PARENT", label: "Parent", desc: "I book tutors & programmes for my child", icon: "👪" },
  { value: "STUDENT", label: "Student", desc: "I learn with NUVORA tutors", icon: "🎓" },
  { value: "TUTOR", label: "Tutor", desc: "I want to apply to teach and earn", icon: "✍️" },
  { value: "INSTITUTION", label: "School / Company", desc: "I represent a school or organisation", icon: "🏫" },
] as const;

const STORAGE_KEY = "nuvora-onboarding-role";

function nextStep(role: string) {
  switch (role) {
    case "TUTOR":
      return "/become-tutor/apply";
    case "INSTITUTION":
      return "/for-schools";
    default:
      return "/onboarding/learner"; // parent & student both add/confirm a learner profile
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const [role, setRole] = useState<string | null>(null);

  // Restore a previously chosen role (stateful across screens).
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && ROLES.some((r) => r.value === saved)) setRole(saved);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/register");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <p className="py-20 text-center text-ink-500">Loading…</p>;
  }

  const continueFlow = () => {
    if (!role) return;
    window.localStorage.setItem(STORAGE_KEY, role);
    router.push(nextStep(role));
  };

  return (
    <AuthShell
      title="How are you planning to use NUVORA?"
      subtitle="We'll streamline your setup experience accordingly."
      image="https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=900&q=80"
      imageAlt="Graduates celebrating learning success"
    >
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={
              role === r.value
                ? "inline-flex h-11 items-center gap-2 rounded-xl border-2 border-brand-gold bg-brand-gold-light px-4 text-sm font-medium text-ink-900"
                : "inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm text-ink-700 transition-colors hover:border-brand-gold hover:bg-brand-gold-light/40"
            }
          >
            <span aria-hidden="true">{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink-500">Help us personalize your experience — this will take less than a minute.</p>

      <button
        type="button"
        onClick={continueFlow}
        disabled={!role}
        className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
      >
        Continue
      </button>

      <p className="mt-4 text-center text-sm text-ink-500">
        Already set up?{" "}
        <button
          type="button"
          onClick={() => router.push(user.roles.includes("TUTOR") ? "/tutor-dashboard" : "/dashboard")}
          className="font-semibold text-brand-gold-dark hover:underline"
        >
          Skip for now
        </button>
      </p>
    </AuthShell>
  );
}
