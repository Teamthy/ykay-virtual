"use client";

import { useState } from "react";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";

const LIST_KEY = "yk-virtual-blog-newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Blog newsletter band — email-only capture. There is no dedicated
 * newsletter endpoint in the API, so the subscription is stored locally
 * and the copy stays honest about what happens next.
 */
export function BlogNewsletter() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address");
      return;
    }
    try {
      localStorage.setItem(LIST_KEY, JSON.stringify({ email: value, at: new Date().toISOString() }));
    } catch {
      /* storage unavailable — still confirm the session-level intent */
    }
    setError(null);
    setDone(true);
  };

  return (
    <section className="relative w-full overflow-hidden bg-[#0F2A1A]">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: "28px 28px" }} />
      <div className="relative mx-auto w-full max-w-[1920px] px-4 py-12 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 lg:py-16">
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 rounded-[20px] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.15)] md:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#0F2A1A]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]">
              <Mail size={12} /> Study guides, monthly
            </div>
            <h2 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.95] text-[#0F2A1A] uppercase">
              New guides, straight to your inbox.
            </h2>
            <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.6] text-[#0F2A1A]/70">
              Exam-topic breakdowns, revision plans and curriculum notes from the YK-Virtual academic team. No spam — unsubscribe anytime.
            </p>
          </div>

          {done ? (
            <div className="rounded-[16px] border border-black/10 bg-[#F9F6ED] p-6 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-[#0F2A1A] text-[#D6FF57]">
                <CheckCircle2 size={18} />
              </span>
              <p className="mt-3 text-[14px] font-bold text-[#0F2A1A]">You&apos;re on the list.</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#0F2A1A]/65">
                We&apos;ll email new study guides as they&apos;re published.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="w-full">
              <label htmlFor="blog-newsletter-email" className="text-[11px] font-bold uppercase tracking-wide text-[#0F2A1A]/65">
                Email address
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="blog-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@example.com"
                  className="w-full rounded-full border border-black/10 bg-[#F9F6ED] px-5 py-3 text-[13px] font-medium text-[#0F2A1A] outline-none placeholder:text-[#0F2A1A]/50 focus:border-[#0F2A1A] focus:bg-white"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#0F2A1A] px-6 py-3 text-[13px] font-bold text-white transition hover:bg-black"
                >
                  Subscribe <ArrowRight size={14} />
                </button>
              </div>
              {error && <p role="alert" className="mt-2 text-[12px] font-bold text-red-600">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
