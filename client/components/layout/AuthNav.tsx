"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, useLogout } from "@/hooks/useSession";
import { isAdmin } from "@/features/auth/api";
import { Skeleton } from "@/components/ui/skeleton";

// Header auth chip: Log in / Register when signed out; account menu (with
// role-aware links) + logout when signed in.
export function AuthNav() {
  const { user, isLoading } = useSession();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900">
        Sign in
      </Link>
    );
  }

  const links = [
    { href: "/dashboard", label: "Parent dashboard" },
    { href: "/messages", label: "Messages" },
    { href: "/notifications", label: "Notifications" },
    ...(user.roles.includes("TUTOR") ? [{ href: "/tutor-dashboard", label: "Tutor dashboard" }] : []),
    ...(isAdmin(user) ? [{ href: "/admin/vetting", label: "Admin console" }] : []),
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-1.5 pr-4 text-sm font-semibold hover:border-brand-blue transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-xs font-bold text-white">
          {user.email.slice(0, 1).toUpperCase()}
        </span>
        {user.email.split("@")[0].slice(0, 12)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-ink-100 bg-white p-2 shadow-lift z-50">
          <p className="px-3 py-2 text-xs text-ink-500 truncate">{user.email}</p>
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                {r}
              </span>
            ))}
          </div>
          <div className="border-t border-ink-100 pt-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={() => void logout()}
              className="block w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
