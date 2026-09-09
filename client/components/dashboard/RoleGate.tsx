"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { DASHBOARD_ROLES, homeForRoles, isAdmin } from "@/hooks/useDashboardRoute";

// RoleGate - every dashboard mounts this first. Once the session resolves,
// a user whose role does not match the page is redirected to their own
// home. Google SSO can take a beat for /auth/me to see the cookie — we
// retry a few times instead of bouncing to /login on the first empty read.

export function RoleGate({ page }: { page: keyof typeof DASHBOARD_ROLES }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      const allowed = DASHBOARD_ROLES[page] ?? [];
      if (isAdmin(user.roles)) {
        if (page !== "/admin") router.replace("/admin");
        return;
      }
      if (!allowed.some((r) => user.roles.includes(r))) {
        router.replace(homeForRoles(user.roles));
      }
      return;
    }
    if (tries < 5) {
      const t = setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["session"] });
        setTries((n) => n + 1);
      }, 350);
      return () => clearTimeout(t);
    }
    router.replace("/login");
  }, [user, isLoading, page, router, tries, qc]);

  return null;
}
