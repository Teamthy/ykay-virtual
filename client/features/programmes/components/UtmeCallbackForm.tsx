"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

// UTME 2026 callback form — captures name + phone and creates a support
// ticket (visible in the admin support queue), same channel as /contact.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export function UtmeCallbackForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("SSS3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("Please tell us your name");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid phone number");
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
          subject: `UTME 2026 callback — ${name.trim()} (${level})`,
          message: `Callback request: ${name.trim()} · ${phone.trim()} · current level ${level}. Contact via phone.`,
        }),
      });
      setDone(true);
      toast.success("Request received — our advisors will call you back");
    } catch {
      setError("Could not submit — please call +234 706 372 6773");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-ink-100 bg-white p-8 shadow-card">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-50 text-brand-green">
          <Phone size={22} />
        </div>
        <h3 className="mt-4 text-center text-xl font-extrabold text-brand-navy">Request received</h3>
        <p className="mt-2 text-center text-sm text-ink-600">
          Our Learning Advisors will call <b>{phone}</b> during office hours. Meanwhile, browse
          the cohort options or ask us anything at hello@nuvora.com.
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
      <h3 className="text-lg font-extrabold text-brand-navy">Request a callback</h3>
      <p className="mt-1 text-sm text-ink-500">Free, no-obligation — we call you back.</p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-semibold text-ink-700">Parent / guardian name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-ink-700">Phone number</span>
          <input
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-ink-700">Candidate&apos;s current level</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none"
          >
            <option>SSS3</option>
            <option>SSS2</option>
            <option>SSS1</option>
            <option>Other / not sure</option>
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Sending…" : "Get a callback"}
        </Button>
        <p className="text-center text-[11px] text-ink-400">
          By submitting you agree to be contacted about NUVORA programmes.
        </p>
      </div>
    </form>
  );
}
