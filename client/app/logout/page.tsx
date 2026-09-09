"use client";

import { useEffect } from "react";
import { useLogout } from "@/hooks/useSession";

// Visiting /logout actually ends the session (cookie + server revoke) then
// sends the visitor home. Previously this page only redirected, so the
// person stayed signed in.
export default function LogoutRedirectPage() {
  const doLogout = useLogout();
  useEffect(() => {
    void doLogout();
    // Intentionally once — useLogout returns a new function each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <p className="px-6 py-16 text-center text-sm text-ink-500">
      Signing you out…
    </p>
  );
}
