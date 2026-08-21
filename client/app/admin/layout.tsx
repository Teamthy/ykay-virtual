"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { AppShell } from "@/components/layout/AppShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return <main className="px-6 py-20 text-center text-ink-500">Loading admin console…</main>;
  }

  if (!user || !isAdmin(user)) {
    return (
      <main className="px-6 py-24 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="mt-4 text-2xl font-extrabold text-deep">Admin access required</h1>
        <p className="mt-2 text-sm text-ink-500">You need an administrator account to view this console.</p>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Log in as admin
        </Link>
      </main>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="mx-auto w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">{children}</div>
    </AppShell>
  );
}
