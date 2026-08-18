"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const FIELD =
  "mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-[#4CCB31] focus:outline-none focus:ring-2 focus:ring-[#4CCB31]/30";

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
          subject: `UTME 2026 enrolment - ${form.name.trim()} (${form.level})`,
          message: `UTME lead: ${form.name.trim()} · ${form.phone.trim()} · ${form.level}.`,
        }),
      });
      setDone(true);
      toast.success("Request received - we will text to confirm");
    } catch {
      setError("Could not submit - please use the contact page");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-7 text-center shadow-lg">
        <h3 className="text-xl font-bold text-[#013920]">Request received</h3>
        <p className="mt-2 text-sm text-ink-600">
          We will text <b>{form.phone}</b> to confirm.
        </p>
        <button type="button" onClick={() => setDone(false)} className="mt-4 text-sm font-semibold text-[#4CCB31] hover:underline">
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
      className="rounded-2xl bg-white p-6 shadow-lg sm:p-7"
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold text-[#013920]">Start UTME prep</h3>
        <p className="mt-2 text-sm text-ink-600">We will text on SMS or WhatsApp to confirm your number.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink-800">
          Parent / guardian name
          <input
            type="text"
            className={FIELD}
            placeholder="e.g. Mrs Bello"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium text-ink-800">
          Current level
          <select className={FIELD} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option>SSS3</option>
            <option>SSS2</option>
            <option>SSS1</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-ink-800">
        Phone number
        <input
          type="tel"
          className={FIELD}
          placeholder="+234 800 000 0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>

      <label className="mt-5 flex items-start gap-3 text-sm text-ink-800">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 size-4 rounded border-ink-300 text-[#4CCB31]"
        />
        <span>
          I accept the{" "}
          <Link href="/terms" className="font-medium text-[#4CCB31] hover:underline">
            Terms
          </Link>
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-[#4CCB31] py-3 text-sm font-bold text-white hover:bg-[#5FE63F] disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Get started"}
      </button>
    </form>
  );
}
