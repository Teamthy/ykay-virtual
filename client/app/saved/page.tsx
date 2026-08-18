"use client";

import Link from "next/link";
import { loginWithReturn } from "@/lib/safe-next";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWishlist } from "@/features/wishlist/hook";
import { useSession } from "@/hooks/useSession";

// Saved tutors (P2 wishlist).

export default function SavedPage() {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { saved, remove } = useWishlist();

  useEffect(() => {
    if (!isLoading && !user) router.replace(loginWithReturn());
  }, [isLoading, user, router]);

  return (
    <main className="min-h-screen bg-[#FFF7E4] pb-16 dark:bg-[#0B1220]">
      <header className="border-b border-ink-100 bg-white dark:border-ink-700 dark:bg-[#141C2E]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            <Link href="/" className="hover:text-brand-gold-dark">NUVORA</Link> / Saved
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-[0.02em] text-brand-navy dark:text-white">
            Saved tutors
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {saved.length > 0
              ? `${saved.length} tutor${saved.length > 1 ? "s" : ""} on your list - stored on this device.`
              : "Tutors you heart will appear here."}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {saved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-12 text-center dark:border-ink-700 dark:bg-[#141C2E]">
            <p className="text-3xl">💛</p>
            <p className="mt-2 font-semibold text-ink-700 dark:text-ink-200">No saved tutors yet</p>
            <p className="mt-1 text-sm text-ink-500">Tap the heart on any tutor to save them here.</p>
            <Link
              href="/tutors"
              className="mt-5 inline-flex rounded-lg bg-brand-gold px-6 py-2.5 text-sm font-bold text-ink-900 hover:bg-brand-gold-hover"
            >
              Browse tutors
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {saved.map((t) => (
              <div key={t.slug} className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm dark:border-ink-700 dark:bg-[#141C2E]">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gold-light text-lg font-bold text-brand-navy">
                  {t.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link href={`/tutors/${t.slug}`} className="font-bold text-brand-navy hover:text-brand-gold-dark dark:text-white">
                    {t.name}
                  </Link>
                  <p className="truncate text-sm text-ink-500">
                    {t.subjects.join(" · ")}
                    {t.rating > 0 ? ` · ★ ${t.rating.toFixed(1)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.slug)}
                  className="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-bold text-ink-500 hover:border-red-300 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
