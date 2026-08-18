"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Old /logout URL — send people back. Confirmation is a modal on the current page.
export default function LogoutRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <p className="px-6 py-16 text-center text-sm text-ink-500">Taking you back…</p>;
}
