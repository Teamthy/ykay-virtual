"use client";

import { useState } from "react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const FIELD =
  "mt-1 w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30";

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
          message: `GMAT lead: ${form.first_name.trim()} · ${form.phone.trim()} · ${form.country}.`,
        }),
      });
      setDone(true);
      toast.success("Request received — our advisors will be in touch");
    } catch {
      setError("Could not submit — please use the contact page");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
        <h3 className="text-xl font-bold text-ink-900">Request received</h3>
        <p className="mt-2 text-sm text-ink-600">
          We will contact <b>{form.first_name}</b> at {form.phone}.
        </p>
        <button type="button" onClick={() => setDone(false)} className="mt-4 text-sm font-semibold text-brand-gold-dark hover:underline">
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
        <h3 className="text-2xl font-bold text-ink-900">Get a GMAT tutor</h3>
        <p className="mt-2 text-sm text-ink-600">Tell us your goal and we will match a vetted tutor.</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-ink-800">
          First name
          <input
            type="text"
            className={FIELD}
            placeholder="e.g. Ada"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium text-ink-800">
          Country
          <select
            className={FIELD}
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          >
            <option>Nigeria</option>
            <option>Ghana</option>
            <option>Kenya</option>
            <option>South Africa</option>
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

      <label className="mt-4 block text-sm font-medium text-ink-800">
        Email
        <input
          type="email"
          className={FIELD}
          placeholder="you@email.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-brand-gold py-3 px-4 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
