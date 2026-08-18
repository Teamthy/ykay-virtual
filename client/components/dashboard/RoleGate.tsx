"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import { DASHBOARD_ROLES, homeForRoles, isAdmin } from "@/hooks/useDashboardRoute";

// RoleGate — every dashboard mounts this first. Once the session resolves,
// a user whose role does not match the page is redirected to their own
// home (industry-standard role routing; middleware only checks the cookie).
export function RoleGate({ page }: { page: keyof typeof DASHBOARD_ROLES }) {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const allowed = DASHBOARD_ROLES[page] ?? [];
    if (isAdmin(user.roles)) {
      if (page !== "/admin") router.replace("/admin");
      return;
    }
    if (!allowed.some((r) => user.roles.includes(r))) {
      router.replace(homeForRoles(user.roles));
    }
  }, [user, isLoading, page, router]);

  return null;
}
