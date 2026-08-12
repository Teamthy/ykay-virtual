"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// GMAT lead form (reference v2.tuteria.com/gmat): first name, phone,
// country, email → creates a support ticket visible in the admin queue.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

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
      <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <h3 className="text-center text-xl font-bold text-brand-navy">Request received 🎉</h3>
        <p className="mt-2 text-center text-sm text-ink-600">
          Our GMAT advisors will contact <b>{form.first_name}</b> at {form.phone} shortly.
        </p>
        <button onClick={() => setDone(false)} className="mt-5 w-full text-center text-sm font-semibold text-brand-blue hover:underline">
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
      className="rounded-3xl border border-ink-100 bg-white p-8 shadow-card"
    >
      <h3 className="text-lg font-bold text-brand-navy">Get a GMAT tutor</h3>
      <p className="mt-1 text-sm text-ink-500">Tell us your goal and we&apos;ll match a top-rated tutor.</p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold text-ink-700">First Name</span>
          <input
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Your first name"
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-ink-700">Phone Number</span>
          <input
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+234 800 000 0000"
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="font-semibold text-ink-700">Country</span>
            <select
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
            >
              <option>Nigeria</option>
              <option>Ghana</option>
              <option>Kenya</option>
              <option>South Africa</option>
              <option>Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-ink-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Your email"
              className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Send request"}
        </Button>
        <p className="text-center text-[11px] text-ink-400">
          We&apos;ve helped hundreds of people like you pass their GMAT exams.
        </p>
      </div>
    </form>
  );
}
