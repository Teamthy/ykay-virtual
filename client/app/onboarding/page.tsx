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
import { useQueryClient } from "@tanstack/react-query";
import { safeNextPath } from "@/lib/safe-next";
import {
  register,
  requestLoginCode,
  confirmLoginCode,
  setPrimaryRole,
  changePassword,
  markOnboarded,
} from "@/features/auth/api";

// ── Stateful 7-step onboarding (phase 30) — hardened (phase 32) ───────────
//  1 Account        name + email (creates the account with a generated
//                   password; the user sets a real one in step 5)
//  2 Verify email  6-digit code via login-code (proves ownership → session)
//  3 Select role   Parent / Student / Tutor / School-Company (persisted)
//  4 Your path     role-specific "what's next" selection
//  5 Complete      phone + set your password (strength meter)
//  6 About you     bio + preferred language
//  7 Done          → dashboard
//
// IMPORTANT: step components are hoisted OUT of the page component. Defining
// them inline caused React to remount the subtree on every keystroke → inputs
// lost focus → "one character at a time" typing.

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
  next?: string;
};

const ROLES = [
  { value: "PARENT", label: "Parent", desc: "I book tutors & programmes for my child", icon: "👪" },
  { value: "STUDENT", label: "Student", desc: "I learn with NUVORA tutors", icon: "🎓" },
  { value: "TUTOR", label: "Tutor", desc: "I want to apply to teach and earn", icon: "✍️" },
  { value: "INSTITUTION", label: "School / Company", desc: "I represent a school or organisation", icon: "🏫" },
] as const;

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Create your account", subtitle: "Start with your name and email — it takes under 2 minutes." },
  2: { title: "Verify your email", subtitle: "Enter the 6-digit code we emailed you." },
  3: { title: "How are you planning to use NUVORA?", subtitle: "Select the role that best describes you." },
  4: { title: "What's next for you?", subtitle: "Tell us a little more so we can point you in the right direction." },
  5: { title: "Complete your profile", subtitle: "Add your contact details and secure your account." },
  6: { title: "About you", subtitle: "Optional details to personalise your experience." },
  7: { title: "You're all set!", subtitle: "Your account is ready." },
};

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

// ── Shared bits ────────────────────────────────────────────────────────────

function ContinueBtn({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {error}
    </div>
  );
}

// ── Step 1: name + email (creates the account) ────────────────────────────

function Step1({
  state,
  save,
  submitting,
  onContinue,
}: {
  state: ObState;
  save: (p: Partial<ObState>) => void;
  submitting: boolean;
  onContinue: () => void;
}) {
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
            autoFocus
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
            onKeyDown={(e) => e.key === "Enter" && void onContinue()}
          />
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Continue"}
        </button>
      </div>
      <p className="text-xs leading-5 text-ink-400">
        We&apos;ll send a 6-digit code to your email to verify it. By continuing you agree to our{" "}
        <Link href="/terms" className="font-medium text-brand-gold-dark hover:underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-brand-gold-dark hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

// ── Step 2: verify email with 6-digit code ────────────────────────────────

function Step2({
  email,
  code,
  setCode,
  codeSent,
  countdown,
  submitting,
  onSend,
  onVerify,
}: {
  email: string;
  code: string;
  setCode: (v: string) => void;
  codeSent: boolean;
  countdown: number;
  submitting: boolean;
  onSend: () => void;
  onVerify: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-ink-200 bg-surface-muted px-4 py-3 text-sm text-ink-600">
        We emailed a 6-digit code to <span className="font-semibold text-brand-navy">{email}</span>. Enter it below to
        verify your email.
      </div>
      <div>
        <label htmlFor="ob-code" className="mb-1.5 block text-sm font-medium text-ink-800">
          Verification code
        </label>
        <input
          id="ob-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          placeholder="000000"
          className={cn(INPUT_CLS, "font-mono text-lg tracking-[0.35em]")}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && code.length === 6 && void onVerify()}
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSend}
          disabled={submitting || countdown > 0}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-ink-300 bg-white px-4 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-400 disabled:pointer-events-none disabled:opacity-50"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : codeSent ? "Resend code" : "Send code"}
        </button>
        <button
          type="button"
          onClick={onVerify}
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

// ── Step 3: role selection ────────────────────────────────────────────────

function Step3({
  selected,
  onSelect,
  submitting,
  onContinue,
}: {
  selected: string | null;
  onSelect: (v: string) => void;
  submitting: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-3">
      {ROLES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onSelect(r.value)}
          aria-pressed={selected === r.value}
          className={cn(
            "flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors",
            selected === r.value ? "border-brand-gold bg-brand-gold-light" : "border-ink-200 bg-white hover:border-ink-300"
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
              selected === r.value ? "border-brand-gold bg-brand-gold" : "border-ink-300"
            )}
            aria-hidden="true"
          >
            {selected === r.value && (
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
      <ContinueBtn onClick={onContinue} label={submitting ? "Saving…" : "Continue"} disabled={!selected || submitting} />
    </div>
  );
}

// ── Step 4: role-specific "what's next" ───────────────────────────────────

function Step4({ state, save, onNext }: { state: ObState; save: (p: Partial<ObState>) => void; onNext: () => void }) {
  const r = state.role;
  if (r === "PARENT")
    return (
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Who is learning with NUVORA?</span>
          <div className="flex flex-wrap gap-2">
            {["My child", "Myself", "Both"].map((o) => (
              <Chip key={o} selected={state.parent?.forWhom === o} onClick={() => save({ parent: { ...state.parent, forWhom: o } })}>
                {o}
              </Chip>
            ))}
          </div>
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
                  <Chip
                    key={l}
                    selected={state.parent?.childLevel === l}
                    onClick={() => save({ parent: { ...state.parent, childLevel: l } })}
                  >
                    {l}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}
        <ContinueBtn onClick={onNext} label="Continue" />
      </div>
    );
  if (r === "STUDENT")
    return (
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">What are you preparing for?</span>
          <div className="flex flex-wrap gap-2">
            {["School exams", "SAT / ACT", "GMAT / GRE", "IELTS / TOEFL", "Study abroad", "University admission"].map(
              (g) => {
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
              }
            )}
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
        <ContinueBtn onClick={onNext} label="Continue" />
      </div>
    );
  if (r === "TUTOR")
    return (
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">What would you like to teach?</span>
          <div className="flex flex-wrap gap-2">
            {["Mathematics", "English", "Sciences", "Languages", "Computer Science", "Business", "Test prep"].map(
              (s) => {
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
              }
            )}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-800">Levels</span>
          <div className="flex flex-wrap gap-2">
            {["Primary", "Secondary", "Undergraduate", "Professional"].map((l) => {
              const on = state.tutor?.levels?.includes(l) ?? false;
              return (
                <Chip
                  key={l}
                  selected={on}
                  onClick={() =>
                    save({
                      tutor: {
                        ...state.tutor,
                        levels: on ? (state.tutor?.levels ?? []).filter((x) => x !== l) : [...(state.tutor?.levels ?? []), l],
                      },
                    })
                  }
                >
                  {l}
                </Chip>
              );
            })}
          </div>
        </div>
        <ContinueBtn onClick={onNext} label="Continue" />
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
              <Chip
                key={k}
                selected={state.institution?.kind === k}
                onClick={() => save({ institution: { ...state.institution, kind: k } })}
              >
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
        <ContinueBtn onClick={onNext} label="Continue" />
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

// ── Step 5: phone + password (strength meter) ─────────────────────────────

function strength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4); // 0..4
}

function StrengthMeter({ pw }: { pw: string }) {
  const s = strength(pw);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  if (!pw) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < s ? colors[Math.max(s - 1, 0)] : "bg-ink-100")} />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-500">
        Password strength: <span className="font-semibold">{labels[s]}</span>
        {s < 3 && <span className="text-ink-400"> — aim for 8+ characters with mixed case, a number and a symbol.</span>}
      </p>
    </div>
  );
}

function Step5({
  state,
  save,
  submitting,
  onDone,
  setError,
}: {
  state: ObState;
  save: (p: Partial<ObState>) => void;
  submitting: boolean;
  onDone: (pw: string, pw2: string, phone: string) => void;
  setError: (e: string | null) => void;
}) {
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
      <StrengthMeter pw={pw} />
      <PasswordInput
        id="ob-pw2"
        label="Confirm password"
        autoComplete="new-password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
      />
      {pw2 && pw !== pw2 && <p className="text-xs text-red-600">Passwords do not match.</p>}
      <ContinueBtn
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
          onDone(pw, pw2, phone);
        }}
        label={submitting ? "Saving…" : "Save & continue"}
        disabled={submitting}
      />
      <p className="text-xs leading-5 text-ink-400">
        Leave the password empty to keep using email codes to sign in — you can add one later.
      </p>
    </div>
  );
}

// ── Step 6: about you ─────────────────────────────────────────────────────

function Step6({ state, save, onNext }: { state: ObState; save: (p: Partial<ObState>) => void; onNext: () => void }) {
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
      <ContinueBtn onClick={onNext} label="Finish setup" />
    </div>
  );
}

// ── Step 7: done ──────────────────────────────────────────────────────────

function Step7({ state, onDone }: { state: ObState; onDone: () => void }) {
  const first = (state.name || state.email).split(" ")[0] || "there";
  const roleLabel = ROLES.find((r) => r.value === state.role)?.label.toLowerCase() ?? "account";
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
        onClick={onDone}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-gold px-4 text-sm font-semibold text-ink-900 transition-colors hover:bg-brand-gold-hover"
      >
        Go to my dashboard
      </button>
      <p className="text-xs text-ink-400">You&apos;ll be taken to your {roleLabel} dashboard.</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

function Loading() {
  return <p className="py-20 text-center text-ink-500">Loading…</p>;
}

function OnboardingInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
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

  const [role, setRole] = useState<string | null>(() => state.role ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Carry a ?next= deep-link target through the whole signup journey.
  useEffect(() => {
    const target = safeNextPath(sp.get("next"));
    if (target && !state.next) save({ next: target });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  // Finished accounts never see the signup steps again — straight through.
  // Reads state.next (persisted) because the step URLs drop the ?next= param.
  useEffect(() => {
    if (!sessionLoading && user?.onboarded) {
      router.replace(safeNextPath(state.next) ?? dashboardFor(user.roles[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, user, router, state.next]);

  const step = useMemo(() => {
    const raw = Number(sp.get("step"));
    if (raw >= 1 && raw <= 7) return raw;
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

  // Auto-verify once 6 digits are entered.
  useEffect(() => {
    if (code.length === 6 && step === 2 && !submitting) void verifyCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

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

  // The verify step promises "we emailed you" — so send the code the moment
  // the step opens instead of making the user click "Send code" first.
  useEffect(() => {
    if (step === 2 && !codeSent && !submitting && state.email) void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    setError(null);
    try {
      const user = await confirmLoginCode(state.email, code);
      // The confirm planted the session cookie — sync the session cache
      // immediately so the page's own guards see the signed-in user.
      qc.setQueryData(["session"], user);
      void qc.invalidateQueries({ queryKey: ["session", "context"] });
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
        go(user.status === "ACTIVE" ? 3 : 2);
        return;
      }
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

  const finishStep5 = async (pw: string, _pw2: string, phone: string) => {
    save({ phone });
    if (!pw) {
      go(6);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await changePassword(pw);
      toast.success("Password set — you can now log in with it anytime.");
      go(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not set your password");
    } finally {
      setSubmitting(false);
    }
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
      footer={
        step > 1 && step < 7 ? (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="text-sm font-medium text-ink-500 transition-colors hover:text-brand-navy"
          >
            ← Back to previous step
          </button>
        ) : undefined
      }
    >
      <Stepper steps={STEPS} current={step - 1} className="mb-7" />

      <ErrorBox error={error} />

      {step === 1 && (
        <Step1 state={state} save={save} submitting={submitting} onContinue={() => void continueStep1()} />
      )}
      {step === 2 && (
        <Step2
          email={state.email}
          code={code}
          setCode={setCode}
          codeSent={codeSent}
          countdown={countdown}
          submitting={submitting}
          onSend={() => void sendCode()}
          onVerify={() => void verifyCode()}
        />
      )}
      {step === 3 && <Step3 selected={role} onSelect={setRole} submitting={submitting} onContinue={() => role && void pickRole(role)} />}
      {step === 4 && <Step4 state={state} save={save} onNext={() => go(5)} />}
      {step === 5 && <Step5 state={state} save={save} submitting={submitting} onDone={finishStep5} setError={setError} />}
      {step === 6 && <Step6 state={state} save={save} onNext={() => go(7)} />}
      {step === 7 && (
        <Step7
          state={state}
          onDone={async () => {
            // Complete the first-time flow server-side so the next login
            // goes straight to the dashboard (never the wizard again).
            try {
              await markOnboarded();
              void qc.invalidateQueries({ queryKey: ["session"] });
            } catch {
              /* never trap the user on the finish line */
            }
            try {
              window.localStorage.removeItem(STORAGE_KEY);
            } catch {
              /* ignore */
            }
            router.push(safeNextPath(state.next) ?? dashboardFor(state.role));
          }}
        />
      )}
    </AuthShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OnboardingInner />
    </Suspense>
  );
}
