"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

// UTME 2026 hero form — Preline-style card: floating labels, terms
// checkbox, green CTA. Creates a real support ticket.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const INPUT_CLS =
  "peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 " +
  "placeholder:text-transparent focus:border-[#4CCB31] focus:ring-[#4CCB31] disabled:opacity-50 " +
  "focus:pt-6 focus:pb-2 not-placeholder-shown:pt-6 not-placeholder-shown:pb-2 autofill:pt-6 autofill:pb-2 " +
  "focus:outline-none transition-colors";

const LABEL_CLS =
  "absolute top-0 inset-x-0 p-3 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 " +
  "border border-transparent origin-top-left text-ink-800 " +
  "peer-focus:scale-90 peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:text-ink-500 " +
  "peer-not-placeholder-shown:scale-90 peer-not-placeholder-shown:translate-x-0.5 " +
  "peer-not-placeholder-shown:-translate-y-1.5 peer-not-placeholder-shown:text-ink-500";

export function UtmeCallbackForm() {
  const [form, setForm] = useState({ name: "", phone: "", level: "SSS3" });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Please tell us your name");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    if (!accepted) {
      setError("Please accept the terms to continue");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await fetch(`${API_BASE}/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "utme-2026@callback.nuvora",
          subject: `UTME 2026 enrolment — ${form.name.trim()} (${form.level})`,
          message: `UTME lead: ${form.name.trim()} · ${form.phone.trim()} · ${form.level}. We'll text on SMS and WhatsApp to confirm.`,
        }),
      });
      setDone(true);
      toast.success("Request received — we'll text to confirm your number");
    } catch {
      setError("Could not submit — please call +234 706 372 6773");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-7 text-center shadow-lg">
        <h3 className="text-xl font-bold text-[#013920]">Request received</h3>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll text <b>{form.phone}</b> on SMS and WhatsApp to confirm your number.
        </p>
        <button onClick={() => setDone(false)} className="mt-4 text-sm font-semibold text-[#4CCB31] hover:underline">
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
        <h3 className="text-2xl font-bold text-[#013920]">Start Your JAMB Prep</h3>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll text on SMS and WhatsApp to confirm your number.
        </p>
      </div>

      <div className="mt-5">
        {/* Floating inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <input
                type="text"
                id="utme-name"
                className={INPUT_CLS}
                placeholder=" "
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <label htmlFor="utme-name" className={LABEL_CLS}>Parent name</label>
            </div>
          </div>
          <div>
            <div className="relative">
              <select
                id="utme-level"
                className="peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:border-[#4CCB31] focus:ring-[#4CCB31] focus:outline-none"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                <option>SSS3</option>
                <option>SSS2</option>
                <option>SSS1</option>
                <option>Other</option>
              </select>
              <label htmlFor="utme-level" className="absolute top-0 inset-x-0 p-3 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 border border-transparent origin-top-left text-ink-800 peer-focus:scale-90 peer-focus:translate-x-0.5 peer-focus:-translate-y-1.5 peer-focus:text-ink-500 peer-not-placeholder-shown:scale-90 peer-not-placeholder-shown:translate-x-0.5 peer-not-placeholder-shown:-translate-y-1.5 peer-not-placeholder-shown:text-ink-500">
                Current level
              </label>
            </div>
          </div>
        </div>

        <div className="relative mt-4 col-span-full">
          <div className="relative">
            <input
              type="tel"
              id="utme-phone"
              className={INPUT_CLS}
              placeholder=" "
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <label htmlFor="utme-phone" className={LABEL_CLS}>Phone number</label>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center">
        <div className="flex">
          <input
            id="utme-terms"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="size-4 shrink-0 rounded-sm border border-ink-300 text-[#4CCB31] focus:ring-0 checked:bg-[#4CCB31] checked:border-[#4CCB31]"
          />
        </div>
        <div className="ms-3">
          <label htmlFor="utme-terms" className="text-sm text-ink-800">
            I accept the{" "}
            <Link href="/terms" className="font-medium text-[#4CCB31] hover:underline">
              Terms and Conditions
            </Link>
          </label>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5">
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#4CCB31] py-3 px-4 text-sm font-medium text-white transition-colors hover:bg-[#5FE63F] disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Get started"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-400">
        Free diagnostic test — we call within 24 hours
      </p>
    </form>
  );
}
