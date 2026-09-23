"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const FIELD =
  "mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-[#0F2A1A] placeholder:text-[#0F2A1A]/65 focus:border-[#D6FF57] focus:outline-none focus:ring-2 focus:ring-[#D6FF57]/30";

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
      await apiFetch<unknown>("/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "utme-2026@callback.ykvirtual",
          subject: `UTME 2026 enrolment - ${form.name.trim()} (${form.level})`,
          message: `UTME lead: ${form.name.trim()} · ${form.phone.trim()} · ${form.level}.`,
        }),
      });
      setDone(true);
      toast.success("Request received — an advisor will contact you");
    } catch {
      setError("Could not submit - please use the contact page");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-[20px] bg-white p-7 text-center text-[#0F2A1A] shadow-lg">
        <h3 className="text-xl font-bold text-[#0F2A1A]">Request received</h3>
        <p className="mt-2 text-sm text-[#0F2A1A]/70">
          An advisor will contact <b>{form.phone}</b> about current availability.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-4 text-sm font-semibold text-[#0F2A1A] hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form
      id="callback"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="scroll-mt-24 rounded-[20px] border border-white/20 bg-white p-6 text-[#0F2A1A] shadow-[0_25px_70px_rgba(0,0,0,0.25)] sm:p-8"
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold text-[#0F2A1A]">Ask about UTME prep</h3>
        <p className="mt-2 text-sm text-[#0F2A1A]/70">
          Tell us how to reach you; an advisor will confirm current timetable and pricing before you pay.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#0F2A1A]/85">
          Parent / guardian name
          <input
            type="text"
            className={FIELD}
            placeholder="e.g. Mrs Bello"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label className="block text-sm font-medium text-[#0F2A1A]/85">
          Current level
          <select
            className={FIELD}
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            <option>SSS3</option>
            <option>SSS2</option>
            <option>SSS1</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-[#0F2A1A]/85">
        Phone number
        <input
          type="tel"
          className={FIELD}
          placeholder="+234 800 000 0000"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>

      <label className="mt-5 flex items-start gap-3 text-sm text-[#0F2A1A]/85">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 size-4 rounded border-black/10 text-[#0F2A1A]"
        />
        <span>
          I accept the{" "}
          <Link
            href="/terms"
            className="font-medium text-[#0F2A1A] hover:underline"
          >
            Terms
          </Link>
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-full bg-[#D6FF57] py-3 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030] disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Request a callback"}
      </button>
    </form>
  );
}
