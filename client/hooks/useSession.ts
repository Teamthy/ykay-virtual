"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, logout, type CurrentUser } from "@/features/auth/api";

// Session hook — resolves the httpOnly-cookie session via /auth/me.
// Used by the header nav and any authenticated surface.

export function useSession() {
  const query = useQuery({
    queryKey: ["session"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    await logout();
    await qc.invalidateQueries({ queryKey: ["session"] });
    await qc.clear();
    window.location.href = "/";
  };
}

export type { CurrentUser };
