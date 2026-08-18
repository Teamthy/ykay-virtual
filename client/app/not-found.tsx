import Link from "next/link";
import { Search, Compass, LifeBuoy, MessageSquare } from "lucide-react";

// Hard 404 page (never a soft-404 200 - SEO rule). Suggests the most likely
// destinations instead of dead-ending the visitor.

const POPULAR_SUBJECTS = [
  { name: "Mathematics", href: "/subjects/mathematics" },
  { name: "English Language", href: "/subjects/english-language" },
  { name: "Physics", href: "/subjects/physics" },
  { name: "Chemistry", href: "/subjects/chemistry" },
  { name: "Biology", href: "/subjects/biology" },
];

const QUICK_LINKS = [
  { name: "Find a tutor", href: "/tutors", icon: Compass },
  { name: "Exam preparation", href: "/exam-prep", icon: Compass },
  { name: "Browse programmes", href: "/programmes", icon: Compass },
  { name: "Pricing", href: "/pricing", icon: Compass },
];

export default function NotFound() {
  return (
    <main className="container-x py-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="font-display text-7xl font-extrabold tracking-[0.02em] text-brand-blue">404</div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Try one of these instead.
        </p>

        <Link
          href="/search"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-gold px-6 py-3 text-sm font-bold text-ink-900 transition hover:-translate-y-0.5 hover:bg-brand-gold-hover"
        >
          <Search size={16} /> Search NUVORA
        </Link>

        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-4 text-sm font-semibold text-brand-navy transition-colors hover:border-brand-gold"
            >
              <span className="grid size-9 place-items-center rounded-xl bg-brand-gold-light text-brand-green">
                <l.icon size={17} />
              </span>
              {l.name}
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-ink-100 bg-white p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
            Popular subjects
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {POPULAR_SUBJECTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-gold hover:text-brand-blue"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-ink-500">
          <Link href="/help" className="inline-flex items-center gap-1.5 font-semibold hover:text-brand-blue">
            <LifeBuoy size={15} /> Help Center
          </Link>
          <Link href="/contact" className="inline-flex items-center gap-1.5 font-semibold hover:text-brand-blue">
            <MessageSquare size={15} /> Contact support
          </Link>
        </div>
      </div>
    </main>
  );
}
