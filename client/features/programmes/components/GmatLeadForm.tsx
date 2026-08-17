"use client";

import { useState } from "react";
import { toast } from "sonner";

// GMAT lead form — Preline floating-label style (name / phone / country /
// email) → creates a support ticket visible in the admin queue.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const INPUT_CLS =
  "peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 " +
  "placeholder:text-transparent focus:border-brand-gold focus:ring-brand-gold disabled:opacity-50 " +
  "focus:pt-6 focus:pb-2 not-placeholder-shown:pt-6 not-placeholder-shown:pb-2 autofill:pt-6 autofill:pb-2 " +
  "focus:outline-none transition-colors";

const LABEL_CLS =
  "absolute top-0 inset-x-0 p-3 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 " +
  "border border-transparent origin-top-left text-ink-800 " +
  "peer-focus:scale-90 peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:text-ink-500 " +
  "peer-not-placeholder-shown:scale-90 peer-not-placeholder-shown:translate-x-0.5 " +
  "peer-not-placeholder-shown:-translate-y-1.5 peer-not-placeholder-shown:text-ink-500";

export function GmatLeadForm() {
  const [form, setForm] = useState({ first_name: "", phone: "", country: "Nigeria", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!form.first_name.trim()) {
      setError("Please enter your first name");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          subject: `GMAT prep request — ${form.first_name.trim()}`,
          message: `GMAT lead: ${form.first_name.trim()} · ${form.phone.trim()} · ${form.country}. Contact via phone/email.`,
        }),
      });
      setDone(true);
      toast.success("Request received — our advisors will be in touch");
    } catch {
      setError("Could not submit — please call +234 706 372 6773");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <h3 className="text-xl font-bold text-ink-900">Request received 🎉</h3>
        <p className="mt-2 text-sm text-ink-600">
          Our GMAT advisors will contact <b>{form.first_name}</b> at {form.phone} shortly.
        </p>
        <button onClick={() => setDone(false)} className="mt-4 text-sm font-semibold text-brand-gold-dark hover:underline">
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-2xl bg-white p-4 shadow-lg sm:p-7"
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold text-ink-900">Get a GMAT tutor</h3>
        <p className="mt-2 text-sm text-ink-600">Tell us your goal and we&apos;ll match a top-rated tutor.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="relative">
            <input
              type="text"
              id="gmat-first-name"
              className={INPUT_CLS}
              placeholder=" "
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <label htmlFor="gmat-first-name" className={LABEL_CLS}>First Name</label>
          </div>
        </div>
        <div>
          <div className="relative">
            <select
              id="gmat-country"
              className="peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:border-brand-gold focus:ring-brand-gold focus:outline-none"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              <option>Nigeria</option>
              <option>Ghana</option>
              <option>Kenya</option>
              <option>South Africa</option>
              <option>Other</option>
            </select>
            <label htmlFor="gmat-country" className="absolute top-0 inset-x-0 p-3 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 border border-transparent origin-top-left text-ink-800 peer-focus:scale-90 peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:text-ink-500 peer-not-placeholder-shown:scale-90 peer-not-placeholder-shown:translate-x-0.5 peer-not-placeholder-shown:-translate-y-1.5 peer-not-placeholder-shown:text-ink-500">
                Country
              </label>
            </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="relative">
          <input
            type="tel"
            id="gmat-phone"
            className={INPUT_CLS}
            placeholder="+234 800 000 0000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <label htmlFor="gmat-phone" className={LABEL_CLS}>Phone Number</label>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="relative">
          <input
            type="email"
            id="gmat-email"
            className={INPUT_CLS}
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <label htmlFor="gmat-email" className={LABEL_CLS}>Email</label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5">
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand-gold py-3 px-4 text-sm font-medium text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-400">
        We&apos;ve helped hundreds of people like you pass their GMAT exams.
      </p>
    </form>
  );
}
