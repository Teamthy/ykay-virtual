import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiV1Base, destForUser } from "@/lib/auth-session";
import { safeNextPath } from "@/lib/safe-next";
import { AuthCompleteFail } from "./fail";

// Server landing pad after Google / College SSO. We verify the cookie
// against the API with BOTH Cookie and Bearer so a rewrite that drops
// cookies cannot bounce the user to /login. Client /auth/me is not used
// for this first hop.

type User = {
  onboarded?: boolean;
  roles?: string[];
  status?: string;
};

async function loadUser(token: string): Promise<User | null> {
  const base = apiV1Base();
  try {
    const res = await fetch(`${base}/auth/me`, {
      headers: {
        Cookie: `ykv_session=${token}`,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: User };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export default async function AuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const token = (await cookies()).get("ykv_session")?.value;
  if (!token) return <AuthCompleteFail />;

  const user = await loadUser(token);
  if (!user) return <AuthCompleteFail />;

  if (user.status === "PENDING_VERIFICATION") {
    redirect("/verify-email?sent=1");
  }

  const next = safeNextPath(sp.next);
  if (!user.onboarded) {
    redirect(next && next.startsWith("/onboarding") ? next : "/onboarding/wizard");
  }
  redirect(next ?? destForUser(user));
}
