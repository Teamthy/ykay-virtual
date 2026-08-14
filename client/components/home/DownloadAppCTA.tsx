import Link from "next/link";
import { Smartphone, Wifi, BellRing, MessageSquareText, ArrowRight } from "lucide-react";

// Download the app section (Batch 2) — "NUVORA on the go": CSS-drawn phone
// mockup, feature list, Android CTA pointing at the real /download page.

const FEATURES = [
  { icon: <Smartphone size={16} />, label: "Courses, quizzes & progress in your pocket" },
  { icon: <Wifi size={16} />, label: "Offline LMS — keep learning without data" },
  { icon: <BellRing size={16} />, label: "Lesson reminders & live notifications" },
  { icon: <MessageSquareText size={16} />, label: "Chat with Nuvora, your AI assistant" },
];

export function DownloadAppCTA() {
  return (
    <section className="relative overflow-hidden bg-brand-navy py-20 text-white md:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 20%, rgba(244,180,0,0.15) 2px, transparent 2px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="container-x relative grid items-center gap-14 lg:grid-cols-2">
        {/* Copy + features */}
        <div>
          <p className="tag-handwritten mb-4">NUVORA on the go</p>
          <h2 className="font-display text-3xl tracking-[0.02em] md:text-5xl">
            Your classroom, in your pocket.
          </h2>
          <p className="mt-4 max-w-[520px] leading-relaxed text-white/80">
            Download the NUVORA app and keep learning anywhere — attend live lessons,
            take quizzes, submit assignments and track progress from your phone.
          </p>

          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-white/90">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10">
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/download"
              className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
            >
              Download for Android
              <ArrowRight size={15} />
            </Link>
            <span className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white/80">
              iOS coming soon
            </span>
          </div>
        </div>

        {/* CSS phone mockup */}
        <div className="flex justify-center">
          <div className="relative h-[460px] w-[228px] rounded-[2.6rem] border border-white/20 bg-[#0B1220] p-3 shadow-2xl">
            <div className="absolute left-1/2 top-2.5 h-5 w-24 -translate-x-1/2 rounded-full bg-[#0B1220]" />
            <div className="flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-white">
              {/* App header */}
              <div className="bg-brand-navy px-4 pb-3 pt-7">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold tracking-[0.15em] text-white">NUVORA</span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-gold text-[11px] font-extrabold text-ink-900">K</span>
                </div>
                <p className="mt-3 text-lg font-extrabold text-white">Welcome back, Kemi 👋</p>
                <p className="mt-0.5 text-[11px] text-white/70">What would you like to do today?</p>
              </div>
              {/* App cards */}
              <div className="space-y-2.5 bg-[#FFFCF5] p-4">
                {[
                  { icon: "📚", title: "My Learning", desc: "Lessons, resources, assignments" },
                  { icon: "📝", title: "Quizzes", desc: "Auto-graded assessments" },
                  { icon: "📈", title: "Progress", desc: "Attendance + tutor reports" },
                  { icon: "🔔", title: "Notifications", desc: "Reminders and updates", badge: "3" },
                ].map((c) => (
                  <div key={c.title} className="flex items-center gap-3 rounded-xl border border-[#E8E4DA] bg-white p-3">
                    <span className="text-base">{c.icon}</span>
                    <span className="flex-1">
                      <span className="block text-xs font-bold text-ink-900">{c.title}</span>
                      <span className="block text-[10px] text-ink-500">{c.desc}</span>
                    </span>
                    {c.badge ? (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-gold px-1 text-[10px] font-extrabold text-ink-900">
                        {c.badge}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
