"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, getSessionContext, logout, type CurrentUser } from "@/features/auth/api";
import { clearOnboardingDraft } from "@/lib/onboarding";

// Session hook — resolves the httpOnly-cookie session via /auth/me.
// Used by the header nav and any authenticated surface.

export function useSession() {
  const query = useQuery({
    queryKey: ["session"],
    queryFn: getCurrentUser,
    staleTime: 60_000,
    retry: false,
  });
  const context = useQuery({
    queryKey: ["session", "context"],
    queryFn: getSessionContext,
    enabled: !!query.data,
    staleTime: 60_000,
    retry: false,
  });
  return {
    user: query.data ?? null,
    context: context.data ?? null,
    isLoading: query.isLoading || context.isLoading,
    isAuthenticated: !!query.data,
  };
}

export function useLogout() {
  const qc = useQueryClient();
  return async () => {
    // A-27: clear the in-progress onboarding draft so the next user on this
    // browser starts signup fresh (never inherits the previous user's state).
    clearOnboardingDraft();
    await logout();
    await qc.invalidateQueries({ queryKey: ["session"] });
    await qc.clear();
    window.location.href = "/";
  };
}

export type { CurrentUser };
