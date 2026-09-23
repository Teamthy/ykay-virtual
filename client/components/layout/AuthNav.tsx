"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { LogoutDialog } from "@/components/layout/LogoutDialog";
import { isAdmin } from "@/features/auth/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useDict } from "@/hooks/useDict";
import { cn } from "@/lib/utils";

// Header auth chip: Log in / Register when signed out; account menu (with
// role-aware links) + logout when signed in. `tone="dark"` renders the
// trigger for the dark floating pill header; the dropdown stays white.
export function AuthNav({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { user, isLoading } = useSession();
  const { t } = useDict();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (isLoading) {
    return (
      <Skeleton
        className={cn(
          "h-9 w-24 rounded-full",
          tone === "dark" ? "bg-white/15" : "bg-[#0F2A1A]/10",
        )}
      />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          tone === "dark"
            ? "text-white/75 hover:bg-white/10 hover:text-white"
            : "text-[#0F2A1A]/75 hover:bg-[#F9F6ED] hover:text-[#0F2A1A]",
        )}
      >
        {t("auth.login")}
      </Link>
    );
  }

  // Role-aware primary dashboard link (a STUDENT must never see "Parent
  // dashboard"; each role gets its own personalized destination).
  const primaryDashboard = isAdmin(user)
    ? { href: "/admin", label: "Admin console" }
    : user.roles.includes("TUTOR")
      ? { href: "/tutor-dashboard", label: "Tutor dashboard" }
      : user.roles.includes("STUDENT")
        ? { href: "/student-dashboard", label: "My dashboard" }
        : { href: "/dashboard", label: "Parent dashboard" };

  const links = [
    primaryDashboard,
    { href: "/account", label: "Account" },
    { href: "/messages", label: "Messages" },
    { href: "/notifications", label: "Notifications" },
  ];

  // Avatar: use the profile image when present, otherwise a letter tile.
  const initials = (user.first_name?.[0] ?? user.email[0] ?? "?").toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-colors",
          tone === "dark"
            ? "border-white/20 bg-white/5 text-white hover:border-white/40"
            : "border-black/10 text-[#0F2A1A] hover:border-[#0F2A1A]",
        )}
      >
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-xs font-bold",
            tone === "dark" ? "bg-white text-[#0F2A1A]" : "bg-[#0F2A1A] text-white",
          )}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden sm:inline">{user.first_name?.slice(0, 14) ?? user.email.split("@")[0].slice(0, 12)}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/10 bg-white p-2 shadow-lift z-50">
          <p className="px-3 py-2 text-xs text-[#0F2A1A]/65 truncate">{user.email}</p>
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F9F6ED] text-[#0F2A1A]/70">
                {r}
              </span>
            ))}
          </div>
          <div className="border-t border-black/10 pt-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-[#0F2A1A]/75 hover:bg-[#F9F6ED]"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/logout"
              onClick={() => setOpen(false)}
              className="block w-full text-left rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Log out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
