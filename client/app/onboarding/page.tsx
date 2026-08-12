"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/layout/AuthShell";
import { Stepper } from "@/components/ui/stepper";
import { PasswordInput, INPUT_CLS } from "@/components/ui/password-input";
import { GoogleButton } from "@/components/ui/google-button";
import { useSession } from "@/hooks/useSession";
import {
  register,
  requestLoginCode,
  confirmLoginCode,
  setPrimaryRole,
  changePassword,
} from "@/features/auth/api";

// ── Stateful 7-step onboarding (phase 30) ─────────────────────────────────
//  1 Account        name + email (creates the account with a generated
//                   password; the user sets a real one in step 5)
//  2 Verify email  6-digit code via login-code (proves ownership → session)
//  3 Select role   Parent / Student / Tutor / School-Company (persisted)
//  4 Your path     role-specific "what's next" selection
//  5 Complete      phone + set your password
//  6 About you     bio + preferred language
//  7 Done          → dashboard
// State survives refreshes (localStorage) and the URL carries ?step=N.

const STEPS = ["Account", "Verify", "Role", "Path", "Profile", "About", "Done"];

const STORAGE_KEY = "nuvora-onboarding";

type ObState = {
  name: string;
  email: string;
  userId?: string;
  verified: boolean;
  role?: "PARENT" | "STUDENT" | "TUTOR" | "INSTITUTION";
  parent?: { forWhom?: string; childName?: string; childLevel?: string };
  student?: { goals?: string[]; level?: string };
  tutor?: { subjects?: string[]; levels?: string[] };
  institution?: { kind?: string; city?: string };
  phone?: string;
  bio?: string;
  language?: string;
};

const ROLES = [
  { value: "PARENT", label: "Parent", desc: "I book tutors & programmes for my child", icon: "👪" },
  { value: "STUDENT", label: "Student", desc: "I learn with NUVORA tutors", icon: "🎓" },
  { value: "TUTOR", label: "Tutor", desc: "I want to apply to teach and earn", icon: "✍️" },
  { value: "INSTITUTION", label: "School / Company", desc: "I represent a school or organisation", icon: "🏫" },
] as const;

function dashboardFor(role?: string) {
  switch (role) {
    case "TUTOR":
      return "/tutor-dashboard";
    case "STUDENT":
      return "/student-dashboard";
    default:
      return "/dashboard";
  }
}

function randomPassword(len = 24) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let s = "";
  const arr = new Uint32Array(len);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
  else for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 0xffffffff);
  for (let i = 0; i < len; i++) s += chars[arr[i] % chars.length];
  return s;
}

function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors",
        selected
          ? "border-brand-gold bg-brand-gold-light text-brand-navy"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:text-ink-800",
        className
      )}
    >
      {children}
    </button>
  );
}

function Loading() {
  return <p className="py-20 text-center text-ink-500">Loading…</p>;
}

function OnboardingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, isLoading: sessionLoading } = useSession();

  const [state, setState] = useState<ObState>(() => {
    if (typeof window === "undefined") return { name: "", email: "", verified: false };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as ObState;
    } catch {
      /* corrupted state → start over */
    }
    return { name: "", email: "", verified: false };
  });

  const [role, setRole] = useState<string | null>(() => state.role ?? null); // step-3 local selection
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step-2 code controls
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const save = (patch: Partial<ObState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full/blocked — flow continues in memory */
      }
      return next;
    });
  };

  const step = useMemo(() => {
    const raw = Number(sp.get("step"));
    if (raw >= 1 && raw <= 7) return raw;
    // Derive the step from progress when no explicit ?step is given.
    if (!state.verified) return 1;
    if (!state.role) return 3;
    return 5;
  }, [sp, state.verified, state.role]);

  const go = (n: number) => {
    setError(null);
    router.push(`/onboarding?step=${n}`);
  };

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (countdown > 0) timer.current = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [countdown]);

  const sendCode = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await requestLoginCode(state.email);
      setCodeSent(true);
      setCountdown(30);
      toast.success("Code sent — check your inbox (and spam).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const user = await confirmLoginCode(state.email, code);
      save({ verified: true, userId: user.id });
      toast.success("Email verified — welcome to NUVORA!");
      go(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work");
    } finally {
      setSubmitting(false);
    }
  };

  const pickRole = async (r: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await setPrimaryRole(r);
      save({ role: r as ObState["role"] });
      toast.success("Role saved");
      go(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your role");
    } finally {
      setSubmitting(false);
    }
  };

  const continueStep1 = async () => {
    if (!state.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.email)) {
      setError("Enter your name and a valid email to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (user) {
        // Already have an account (e.g. Google sign-in) → skip straight past
        // verification when the email is already proven.
        go(user.status === "ACTIVE" ? 3 : 2);
        return;
      }
      // Create the account with a generated password; the user sets a real
      // one in step 5. Email verification happens in step 2 via a 6-digit code.
      const created = await register({
        email: state.email.trim(),
        password: randomPassword(),
        roles: ["PARENT"],
      });
      save({ userId: created.id, verified: false });
      go(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create your account";
      if (/already registered|already exists/i.test(msg)) {
        setError("This email already has an account — log in instead.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setPassword = async (pw: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(pw);
      toast.success("Password set — you can now log in with it anytime.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set your password");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    go(6);
  };

  // Logged-in guard for steps ≥ 3 (session is created in step 2).
  if (!sessionLoading && !user && step >= 3 && step <= 6) {
    return (
      <AuthShell title="Hold on — sign in first" subtitle="We need your session to keep setting up your account.">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Your account details were found, but the session was lost. Verify your email again to continue.
          </p>
          <button
            type="button"
            onClick={() => go(2)}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 hover:bg-brand-gold-hover"
          >
            Back to email verification
          </button>
        </div>
      </AuthShell>
    );
  }

  const skip = (() => {
    switch (step) {
      case 1:
        return user ? { href: "/onboarding?step=3" } : undefined;
      case 2:
        return undefined;
      case 3:
        return { href: dashboardFor(state.role ?? user?.roles?.[0]) };
      case 4:
        return { href: "/onboarding?step=5" };
      case 5:
        return { href: "/onboarding?step=6" };
      case 6:
        return { href: "/onboarding?step=7" };
      default:
        return undefined;
    }
  })();

  return (
    <AuthShell
      title={STEP_META[step].title}
      subtitle={STEP_META[step].subtitle}
      skip={skip}
      footer={step > 1 && step < 7 ? (
        <button
          type="button"
          onClick={() => go(step - 1)}
          className="text-sm font-medium text-ink-500 transition-colors hover:text-brand-navy"
        >
          ← Back to previous step
        </button>
      ) : undefined}
    >
      <Stepper steps={STEPS} current={step - 1} className="mb-7" />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {step === 1 && <Step1 />}
      {step === 2 && <Step2 />}
      {step === 3 && <Step3 />}
      {step === 4 && <Step4 />}
      {step === 5 && <Step5 />}
      {step === 6 && <Step6 />}
      {step === 7 && <Step7 />}
    </AuthShell>
  );

  function Step1() {
    return (
      <div className="space-y-5">
        <GoogleButton />
        <div className="flex items-center gap-3 text-xs uppercase text-ink-400 before:flex-1 before:border-t before:border-ink-200 before:me-4 after:flex-1 after:border-t after:border-ink-200 after:ms-4">
          Or create your account
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="ob-name" className="mb-1.5 block text-sm font-medium text-ink-800">
              Full name
            </label>
            <input
              id="ob-name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Adaeze Okonkwo"
              className={INPUT_CLS}
              value={state.name}
              onChange={(e) => save({ name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="ob-email" className="mb-1.5 block text-sm font-medium text-ink-800">
              Email address
            </label>
            <input
              id="ob-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={INPUT_CLS}
              value={state.email}
              onChange={(e) => save({ email: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={continueStep1}
            disabled={submitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Continue"}
          </button>
        </div>
        <p className="text-xs leading-5 text-ink-400">
          We&apos;ll send a 6-digit code to your email to verify it. By continuing you agree to our{" "}
          <span className="text-brand-gold-dark">Terms</span> and{" "}
          <span className="text-brand-gold-dark">Privacy Policy</span>.
        </p>
      </div>
    );
  }

  function Step2() {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-ink-200 bg-surface-muted px-4 py-3 text-sm text-ink-600">
          We emailed a 6-digit code to <span className="font-semibold text-brand-navy">{state.email}</span>. Enter it
          below to verify your email.
        </div>
        <div>
          <label htmlFor="ob-code" className="mb-1.5 block text-sm font-medium text-ink-800">
            Verification code
          </label>
          <input
            id="ob-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className={cn(INPUT_CLS, "font-mono text-lg tracking-[0.35em]")}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && code.length === 6 && void verifyCode()}
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={sendCode}
            disabled={submitting || countdown > 0}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400 disabled:pointer-events-none disabled:opacity-50"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : codeSent ? "Resend code" : "Send code"}
          </button>
          <button
            type="button"
            onClick={verifyCode}
            disabled={submitting || code.length !== 6}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Verify email"}
          </button>
        </div>
        <p className="text-xs leading-5 text-ink-400">
          The code expires in 10 minutes. Check your spam folder if it doesn&apos;t arrive.
        </p>
      </div>
    );
  }

  function Step3() {
    return (
      <div className="space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            aria-pressed={role === r.value}
            className={cn(
              "flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors",
              role === r.value
                ? "border-brand-gold bg-brand-gold-light"
                : "border-ink-200 bg-white hover:border-ink-300"
            )}
          >
            <span className="text-2xl" aria-hidden="true">
              {r.icon}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-brand-navy">{r.label}</span>
              <span className="mt-0.5 block text-sm text-ink-500">{r.desc}</span>
            </span>
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2",
                role === r.value ? "border-brand-gold bg-brand-gold" : "border-ink-300"
              )}
              aria-hidden="true"
            >
              {role === r.value && (
                <svg className="size-3 text-ink-900" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => role && void pickRole(role)}
          disabled={!role || submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    );
  }

  function Step4() {
    const r = state.role;
    if (r === "PARENT")
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {["My child", "Myself", "Both"].map((o) => (
              <Chip key={o} selected={state.parent?.forWhom === o} onClick={() => save({ parent: { ...state.parent, forWhom: o } })}>
                {o}
              </Chip>
            ))}
          </div>
          {state.parent?.forWhom && state.parent.forWhom !== "Myself" && (
            <>
              <div>
                <label htmlFor="ob-child" className="mb-1.5 block text-sm font-medium text-ink-800">
                  Learner&apos;s name
                </label>
                <input
                  id="ob-child"
                  type="text"
                  className={INPUT_CLS}
                  placeholder="e.g. Chidera Okonkwo"
                  value={state.parent?.childName ?? ""}
                  onChange={(e) => save({ parent: { ...state.parent, childName: e.target.value } })}
                />
              </div>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-800">Learner&apos;s level</span>
                <div className="flex flex-wrap gap-2">
                  {["Primary", "Secondary", "Undergraduate", "Professional"].map((l) => (
                    <Chip key={l} selected={state.parent?.childLevel === l} onClick={() => save({ parent: { ...state.parent, childLevel: l } })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </>
          )}
          <ContinueBtn onClick={() => go(5)} label="Continue" />
        </div>
      );
    if (r === "STUDENT")
      return (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-800">What are you preparing for?</span>
            <div className="flex flex-wrap gap-2">
              {["School exams", "SAT / ACT", "GMAT / GRE", "IELTS / TOEFL", "Study abroad", "University admission"].map((g) => {
                const on = state.student?.goals?.includes(g) ?? false;
                return (
                  <Chip
                    key={g}
                    selected={on}
                    onClick={() =>
                      save({
                        student: {
                          ...state.student,
                          goals: on ? (state.student?.goals ?? []).filter((x) => x !== g) : [...(state.student?.goals ?? []), g],
                        },
                      })
                    }
                  >
                    {g}
                  </Chip>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-800">Your level</span>
            <div className="flex flex-wrap gap-2">
              {["Primary", "Secondary", "Undergraduate", "Professional"].map((l) => (
                <Chip key={l} selected={state.student?.level === l} onClick={() => save({ student: { ...state.student, level: l } })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <ContinueBtn onClick={() => go(5)} label="Continue" />
        </div>
      );
    if (r === "TUTOR")
      return (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-800">What would you like to teach?</span>
            <div className="flex flex-wrap gap-2">
              {["Mathematics", "English", "Sciences", "Languages", "Computer Science", "Business", "Test prep"].map((s) => {
                const on = state.tutor?.subjects?.includes(s) ?? false;
                return (
                  <Chip
                    key={s}
                    selected={on}
                    onClick={() =>
                      save({
                        tutor: {
                          ...state.tutor,
                          subjects: on ? (state.tutor?.subjects ?? []).filter((x) => x !== s) : [...(state.tutor?.subjects ?? []), s],
                        },
                      })
                    }
                  >
                    {s}
                  </Chip>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-800">Levels</span>
            <div className="flex flex-wrap gap-2">
              {["Primary", "Secondary", "Undergraduate", "Professional"].map((l) => (
                <Chip key={l} selected={state.tutor?.levels?.includes(l) ?? false} onClick={() => save({ tutor: { ...state.tutor, levels: state.tutor?.levels?.includes(l) ? state.tutor.levels!.filter((x) => x !== l) : [...(state.tutor?.levels ?? []), l] } })}>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <ContinueBtn onClick={() => go(5)} label="Continue" />
          <p className="text-xs leading-5 text-ink-400">
            Want to teach on NUVORA? Complete your profile, then{" "}
            <Link href="/become-tutor/apply" className="font-semibold text-brand-gold-dark hover:underline">
              apply to become a tutor
            </Link>
            .
          </p>
        </div>
      );
    if (r === "INSTITUTION")
      return (
        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-800">What kind of institution?</span>
            <div className="flex flex-wrap gap-2">
              {["School", "Academy / Test-prep", "Agency / Consultancy"].map((k) => (
                <Chip key={k} selected={state.institution?.kind === k} onClick={() => save({ institution: { ...state.institution, kind: k } })}>
                  {k}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ob-city" className="mb-1.5 block text-sm font-medium text-ink-800">
              City
            </label>
            <input
              id="ob-city"
              type="text"
              className={INPUT_CLS}
              placeholder="e.g. Lagos"
              value={state.institution?.city ?? ""}
              onChange={(e) => save({ institution: { ...state.institution, city: e.target.value } })}
            />
          </div>
          <ContinueBtn onClick={() => go(5)} label="Continue" />
          <p className="text-xs leading-5 text-ink-400">
            Want to set up your school on NUVORA?{" "}
            <Link href="/for-schools" className="font-semibold text-brand-gold-dark hover:underline">
              Explore NUVORA for schools
            </Link>
            .
          </p>
        </div>
      );
    return <p className="text-sm text-ink-500">Pick a role on the previous step to continue.</p>;
  }

  function Step5() {
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [phone, setPhone] = useState(state.phone ?? "");
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="ob-phone" className="mb-1.5 block text-sm font-medium text-ink-800">
            Phone number <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <input
            id="ob-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+234 800 000 0000"
            className={INPUT_CLS}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <PasswordInput
          id="ob-pw"
          label="Set your password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <PasswordInput
          id="ob-pw2"
          label="Confirm password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            save({ phone });
            if (pw && pw !== pw2) {
              setError("Passwords do not match.");
              return;
            }
            if (pw && pw.length < 8) {
              setError("Password must be at least 8 characters.");
              return;
            }
            if (pw) void setPassword(pw);
            else go(6);
          }}
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save & continue"}
        </button>
        <p className="text-xs leading-5 text-ink-400">
          Leave the password empty to keep using email codes to sign in — you can add one later.
        </p>
      </div>
    );
  }

  function Step6() {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="ob-bio" className="mb-1.5 block text-sm font-medium text-ink-800">
            Tell us about yourself <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            id="ob-bio"
            rows={4}
            className={cn(INPUT_CLS, "h-auto min-h-24 resize-y")}
            placeholder="A short introduction helps tutors and families get to know you…"
            value={state.bio ?? ""}
            onChange={(e) => save({ bio: e.target.value })}
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Preferred language</span>
          <div className="flex flex-wrap gap-2">
            {["English", "French", "Yoruba", "Igbo", "Hausa", "Pidgin"].map((l) => (
              <Chip key={l} selected={state.language === l} onClick={() => save({ language: l })}>
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => go(7)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover"
        >
          Finish setup
        </button>
      </div>
    );
  }

  function Step7() {
    const first = (state.name || state.email).split(" ")[0] || "there";
    const dest = dashboardFor(state.role);
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-gold-light text-4xl" aria-hidden="true">
          🎉
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-brand-navy">You&apos;re all set, {first}!</h3>
          <p className="mt-1.5 text-sm leading-6 text-ink-500">
            Your NUVORA account is ready. Head to your dashboard to explore programmes, cohorts and tutors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(dest)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover"
        >
          Go to my dashboard
        </button>
        <p className="text-xs text-ink-400">You&apos;ll be taken to your {roleLabel()} dashboard.</p>
      </div>
    );
  }

  function roleLabel() {
    return ROLES.find((r) => r.value === state.role)?.label.toLowerCase() ?? "account";
  }

  function ContinueBtn({ onClick, label }: { onClick: () => void; label: string }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover"
      >
        {label}
      </button>
    );
  }
}

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Create your account", subtitle: "Start with your name and email — it takes under 2 minutes." },
  2: { title: "Verify your email", subtitle: "Enter the 6-digit code we emailed you." },
  3: { title: "How are you planning to use NUVORA?", subtitle: "Select the role that best describes you." },
  4: { title: "What's next for you?", subtitle: "Tell us a little more so we can point you in the right direction." },
  5: { title: "Complete your profile", subtitle: "Add your contact details and secure your account." },
  6: { title: "About you", subtitle: "Optional details to personalise your experience." },
  7: { title: "You're all set!", subtitle: "Your account is ready." },
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OnboardingInner />
    </Suspense>
  );
}
