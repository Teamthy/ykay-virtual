"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/hooks/useSession";

// B2B lead form - creates a real institution account (POST /institutions).
// Signed-in users become the institution OWNER membership.

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export function B2BLeadForm({ defaultType, ctaLabel }: { defaultType: string; ctaLabel: string }) {
  const { user } = useSession();
  const [form, setForm] = useState({
    name: "",
    type: defaultType,
    email: "",
    phone: "",
    website: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Please enter the institution name");
      return;
    }
    if (!form.email.includes("@")) {
      toast.error("Please enter a valid contact email");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/institutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          email: form.email || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          description: form.description || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "request failed");
      }
      setDone(true);
      toast.success("Application received!", {
        description: "Our team will contact you within one business day to set up your account.",
      });
    } catch (err) {
      toast.error("Could not submit", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="border rounded-2xl p-8 text-center space-y-3">
        <div className="text-5xl">🏫</div>
        <h3 className="font-bold text-lg">Thank you!</h3>
        <p className="text-sm text-ink-600 max-w-sm mx-auto">
          Your institution application is in. Our partnerships team will reach out to{" "}
          <strong>{form.email}</strong> within one business day.
        </p>
        <Button variant="outline" onClick={() => { setDone(false); setForm({ ...form, name: "", description: "" }); }}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border rounded-2xl p-6 space-y-4">
      <h3 className="font-bold text-lg">Request an account</h3>
      <label className="block text-sm">
        <span className="font-medium">Institution name *</span>
        <input value={form.name} onChange={(e) => set("name", e.target.value)}
          className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
      </label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium">Type</span>
          <select value={form.type} onChange={(e) => set("type", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm">
            <option value="SCHOOL">School</option>
            <option value="CORPORATE">Corporate / Business</option>
            <option value="GOVERNMENT">Government</option>
            <option value="NGO">NGO / Non-profit</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Contact email *</span>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="font-medium">Phone</span>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…"
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Website</span>
          <input value={form.website} onChange={(e) => set("website", e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">What do you need?</span>
        <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Cohort learning for 200 students, staff training, exam prep for Year 11…"
          className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold focus:outline-none" />
      </label>
      {user && (
        <p className="text-xs text-ink-400">
          Signed in as <strong>{user.email}</strong> - you&apos;ll be added as the institution owner.
        </p>
      )}
      <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
        {busy ? "Submitting…" : ctaLabel}
      </Button>
    </form>
  );
}
