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
    <main className="min-h-screen bg-[#F9F6ED] pb-16">
      <header className="bg-[#0F2A1A] text-white">
        <div className="container-x py-12 lg:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
            <Link href="/" className="text-white/70 hover:text-[#D6FF57]">
              YK-Virtual
            </Link>{" "}
            / Saved
          </p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.5rem)] uppercase tracking-[-0.02em] text-white">
            Saved tutors
          </h1>
          <p className="mt-1 text-sm text-white/75">
            {saved.length > 0
              ? `${saved.length} tutor${saved.length > 1 ? "s" : ""} on your list - stored on this device.`
              : "Tutors you heart will appear here."}
          </p>
        </div>
      </header>

      <div className="container-x py-8">
        {saved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center  ">
            <p className="text-3xl">💛</p>
            <p className="mt-2 font-semibold text-[#0F2A1A]/75 ">
              No saved tutors yet
            </p>
            <p className="mt-1 text-sm text-[#0F2A1A]/65">
              Tap the heart on any tutor to save them here.
            </p>
            <Link
              href="/tutors"
              className="mt-5 inline-flex rounded-lg bg-[#D6FF57] px-6 py-2.5 text-sm font-bold text-[#0F2A1A] hover:bg-[#C8F030]"
            >
              Browse tutors
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {saved.map((t) => (
              <div
                key={t.slug}
                className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-4 shadow-sm  "
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#F9F6ED] text-lg font-bold text-[#0F2A1A]">
                  {t.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/tutors/${t.slug}`}
                    className="font-bold text-[#0F2A1A] hover:text-[#0F2A1A] "
                  >
                    {t.name}
                  </Link>
                  <p className="truncate text-sm text-[#0F2A1A]/65">
                    {t.subjects.join(" · ")}
                    {t.rating > 0 ? ` · ★ ${t.rating.toFixed(1)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(t.slug)}
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold text-[#0F2A1A]/65 hover:border-red-300 hover:text-red-600"
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
