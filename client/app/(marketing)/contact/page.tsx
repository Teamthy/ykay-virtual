"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageHero } from "@/components/layout/PageHero";

// Contact / support — creates a real support ticket (POST /support/tickets)
// with toast feedback; advisor channels listed alongside.

const CATEGORIES = ["General enquiry", "Private tuition", "Cohort enrolment", "Payments & refunds", "Technical support", "Safeguarding concern"];

export default function ContactPage() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [learnerLevel, setLearnerLevel] = useState("");
  const [enquirySubject, setEnquirySubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (message.trim().length < 10) {
      toast.error("Please tell us a little more (min 10 characters)");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/support/tickets`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            subject: `[${category}] ${enquirySubject || "General enquiry"}`,
            message: `${name ? "Name: " + name + "\n" : ""}${phone ? "Phone: " + phone + "\n" : ""}${learnerLevel ? "Learner level: " + learnerLevel + "\n" : ""}${message}`,
          }),
        }
      );
      if (!res.ok) throw new Error("failed");
      setSent(true);
      toast.success("Message sent", {
        description: "Our team typically responds within one business day.",
      });
    } catch {
      toast.error("Could not send your message", {
        description: "Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container-x py-12">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact / Support" }]} />

      <PageHero
        eyebrow="We&apos;re here to help"
        title="Contact & Support"
        subtitle="Questions about programmes, payments or your account — send a message and our team will respond within one business day."
        crumbs={[{ name: "Home", href: "/" }, { name: "Contact / Support" }]}
        align="center"
      />


      <div className="mt-10 grid lg:grid-cols-[1fr_0.8fr] gap-10 items-start">
        <form onSubmit={submit} className="border rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-lg">Send a message</h2>
          <div>
            <span className="text-sm font-medium">Category</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                    category === c ? "bg-brand-blue text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium">Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Phone / WhatsApp</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234…"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Email *</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="font-medium">Learner level</span>
              <select value={learnerLevel} onChange={(e) => setLearnerLevel(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none">
                <option value="">Select level…</option>
                <option>Year 7–9 (British)</option>
                <option>IGCSE (Year 10–11)</option>
                <option>A-Level (Year 12–13)</option>
                <option>JSS1–3 (Nigerian)</option>
                <option>SSS1–3 (Nigerian)</option>
                <option>Adult / professional</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Subject</span>
              <input value={enquirySubject} onChange={(e) => setEnquirySubject(e.target.value)}
                placeholder="e.g. Mathematics, IELTS…"
                className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Message *</span>
            <textarea rows={5} required value={message} onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm focus:ring-2 focus:ring-brand-blue focus:outline-none" />
          </label>
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
            {busy ? "Sending…" : sent ? "Sent ✓" : "Send message"}
          </Button>
          <p className="text-xs text-ink-400 text-center">
            Your message creates a trackable support ticket. For safeguarding concerns, a senior
            team member reviews the ticket directly.
          </p>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-28">
          <div className="border rounded-2xl p-6">
            <h2 className="font-bold">Advisor channels</h2>
            <ul className="mt-3 space-y-3 text-sm text-ink-700">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">✉️</span>
                <div>
                  <div className="font-semibold">Email</div>
                  <div className="text-xs text-ink-500">support@nuvora.com</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">💬</span>
                <div>
                  <div className="font-semibold">WhatsApp</div>
                  <div className="text-xs text-ink-500">+234 [number to confirm] · Mon–Sat, 8am–8pm</div>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">🕓</span>
                <div>
                  <div className="font-semibold">Response time</div>
                  <div className="text-xs text-ink-500">Within one business day</div>
                </div>
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-ink-50 border border-ink-100 p-6">
            <h2 className="font-bold">Frequently asked</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                { q: "How do I book a tutor?", a: "/private-tuition" },
                { q: "How much does it cost?", a: "/pricing" },
                { q: "How does payment protection work?", a: "/how-it-works" },
              ].map((f) => (
                <li key={f.q}>
                  <a href={f.a} className="text-brand-blue font-semibold hover:underline">{f.q} →</a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
