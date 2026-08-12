"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

// UTME 2026 hero form — Preline-style card: floating labels, Google/Email
// options, terms checkbox, orange CTA. Creates a real support ticket.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

const INPUT_CLS =
  "peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 " +
  "placeholder:text-transparent focus:border-[#FF6636] focus:ring-[#FF6636] disabled:opacity-50 " +
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
        <h3 className="text-xl font-bold text-[#0A033C]">Request received 🎉</h3>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll text <b>{form.phone}</b> on SMS and WhatsApp to confirm your number.
        </p>
        <button onClick={() => setDone(false)} className="mt-4 text-sm font-semibold text-[#FF6636] hover:underline">
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
        <h3 className="text-2xl font-bold text-[#0A033C]">Start Your JAMB Prep</h3>
        <p className="mt-2 text-sm text-ink-600">
          We&apos;ll text on SMS and WhatsApp to confirm your number.
        </p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          className="w-full inline-flex items-center justify-center gap-x-2 rounded-lg border border-ink-200 bg-white py-3 px-4 text-sm font-medium text-ink-800 shadow-sm hover:bg-ink-50"
        >
          <svg className="h-4 w-auto" viewBox="0 0 46 47" fill="none">
            <path d="M46 24.0287C46 22.09 45.8533 20.68 45.5013 19.2112H23.4694V27.9356H36.4069C36.1429 30.1094 34.7347 33.37 31.5957 35.5731L31.5663 35.8669L38.5191 41.2719L38.9885 41.3306C43.4477 37.2181 46 31.1669 46 24.0287Z" fill="#4285F4" />
            <path d="M23.4694 47C29.8061 47 35.1161 44.9144 39.0179 41.3012L31.625 35.5437C29.6301 36.9244 26.9898 37.8937 23.4987 37.8937C17.2793 37.8937 12.0281 33.7812 10.1505 28.1412L9.88649 28.1706L2.61097 33.7812L2.52296 34.0456C6.36608 41.7125 14.287 47 23.4694 47Z" fill="#34A853" />
            <path d="M10.1212 28.1413C9.62245 26.6725 9.32908 25.1156 9.32908 23.5C9.32908 21.8844 9.62245 20.3275 10.0918 18.8588V18.5356L2.75765 12.8369L2.52296 12.9544C0.909439 16.1269 0 19.7106 0 23.5C0 27.2894 0.909439 30.8731 2.49362 34.0456L10.1212 28.1413Z" fill="#FBBC05" />
            <path d="M23.4694 9.07688C27.8699 9.07688 30.8622 10.9863 32.5344 12.5725L39.1645 6.11C35.0867 2.32063 29.8061 0 23.4694 0C14.287 0 6.36607 5.2875 2.49362 12.9544L10.0918 18.8588C11.9987 13.1894 17.25 9.07688 23.4694 9.07688Z" fill="#EB4335" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 py-3 text-xs uppercase text-ink-400 before:flex-1 before:border-t before:border-ink-200 before:me-6 after:flex-1 after:border-t after:border-ink-200 after:ms-6">
          Or
        </div>

        {/* Floating inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="relative">
              <input
                type="text"
                id="utme-name"
                className={INPUT_CLS}
                placeholder="John"
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
                className="peer p-3 block w-full bg-white border border-ink-200 rounded-lg text-sm text-ink-900 focus:border-[#FF6636] focus:ring-[#FF6636] focus:outline-none"
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
              placeholder="+234 800 000 0000"
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
            className="size-4 shrink-0 rounded-sm border border-ink-300 text-[#FF6636] focus:ring-0 checked:bg-[#FF6636] checked:border-[#FF6636]"
          />
        </div>
        <div className="ms-3">
          <label htmlFor="utme-terms" className="text-sm text-ink-800">
            I accept the{" "}
            <Link href="/contact" className="font-medium text-[#FF6636] hover:underline">
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
          className="w-full rounded-lg bg-[#FF6636] py-3 px-4 text-sm font-medium text-white transition-colors hover:bg-[#FF7A4D] disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Get started"}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-400">
        Free diagnostic test · Join 10k+ students
      </p>
    </form>
  );
}
