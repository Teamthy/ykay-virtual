"use client";

// LeadCapture — conversion follow-up for visitors who browse but don't
// enroll. Mounted on course/cohort pages, it opens:
//   - on exit intent (cursor leaves the top of the page) — the "about to
//     leave without enrolling" moment, or
//   - after `delayMs` on the page (fallback timer), or
//   - when the user clicks the "Get a call back" trigger.
// Shows once per session. The captured lead is WhatsApped to the ops team
// (backend) so they can follow up while intent is hot.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Phone, X } from "lucide-react";
import { captureLead } from "@/features/leads/api";
import { useWhatsAppContact, whatsAppHref } from "@/components/layout/WhatsAppButton";

const SHOWN_KEY = "nuvora-lead-shown";

function leadShownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markLeadShown() {
  try {
    sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    /* ignore */
  }
}

const INPUT_CLS =
  "mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/30";

export function LeadCapture({
  source,
  heading = "Before you go — let's talk",
  body = "Leave your details and our team will call you back within the hour to answer questions and find the right class for you.",
  ctaLabel = "Get a call back",
  delayMs = 30_000,
  exitIntent = true,
}: {
  source: string;
  heading?: string;
  body?: string;
  ctaLabel?: string;
  /** fallback timer before the modal opens (0 disables) */
  delayMs?: number;
  exitIntent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const whatsapp = useWhatsAppContact();

  useEffect(() => {
    if (leadShownThisSession()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (delayMs > 0) {
      timer = setTimeout(() => openLead(), delayMs);
    }

    const onExit = (e: MouseEvent) => {
      if (!exitIntent) return;
      if (e.clientY > 8) return; // only the "leaving through the top" gesture
      openLead();
    };

    const openLead = () => {
      if (firedRef.current || leadShownThisSession()) return;
      firedRef.current = true;
      markLeadShown();
      setOpen(true);
    };

    document.addEventListener("mouseout", onExit);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("mouseout", onExit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
      setError("Enter a valid phone number so we can reach you.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("That email doesn't look right.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await captureLead({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        source,
        intent: "CALLBACK_REQUEST",
        message: message.trim() || undefined,
      });
      setSent(true);
      toast.success("Thanks! Our team will reach out shortly.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your details — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* CTA trigger */}
      <button
        type="button"
        onClick={() => {
          markLeadShown();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-brand-gold bg-brand-gold-light px-4 py-2 text-xs font-bold text-brand-gold-dark transition-colors hover:bg-brand-gold hover:text-ink-900"
      >
        <Phone size={13} /> {ctaLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-card">
            <div className="flex items-start justify-between gap-4 bg-brand-navy p-5">
              <div>
                <p className="font-display text-lg font-bold text-white">{sent ? "You're on the list 🎉" : heading}</p>
                {!sent && <p className="mt-1 text-xs text-white/70">We call back fast — usually within the hour.</p>}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>

            {sent ? (
              <div className="space-y-4 p-6">
                <p className="text-sm leading-relaxed text-ink-600">
                  Thanks <strong>{name.split(" ")[0]}</strong>! Our team will call{" "}
                  <strong>{phone}</strong> shortly. Want to talk right now instead?
                </p>
                {whatsapp ? (
                  <a
                    href={whatsAppHref(whatsapp.link, `Hello NUVORA! I'm ${name} (${phone}). I was browsing ${source} and I'd like to talk.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-bold text-white"
                  >
                    Chat with us now on WhatsApp
                  </a>
                ) : (
                  <p className="text-sm font-semibold text-ink-700">Keep your phone close — we&apos;ll be in touch soon.</p>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-full border border-ink-200 px-4 text-sm font-semibold text-ink-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                className="space-y-4 p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <p className="text-sm leading-relaxed text-ink-600">{body}</p>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="lead-name">Your name</label>
                  <input id="lead-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Adaeze Okonkwo" className={INPUT_CLS} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="lead-phone">Phone (WhatsApp) *</label>
                    <input id="lead-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 801 234 5678" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="lead-email">Email (optional)</label>
                    <input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={INPUT_CLS} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500" htmlFor="lead-msg">Anything specific? (optional)</label>
                  <textarea id="lead-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. My daughter is in JSS2 and struggles with maths…" className={`${INPUT_CLS} resize-y`} />
                </div>

                {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-gold px-4 text-sm font-bold text-ink-900 transition-colors hover:bg-brand-gold-hover disabled:opacity-50"
                >
                  <Phone size={15} /> {busy ? "Sending…" : "Call me back"}
                </button>
                <p className="text-center text-[11px] text-ink-400">
                  We only use these details to call you about NUVORA — no spam, ever.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
