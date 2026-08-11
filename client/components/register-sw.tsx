"use client";

import { useEffect } from "react";

// Registers the PWA service worker in the browser only.
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration is progressive enhancement — never block the app.
      });
    }
  }, []);
  return null;
}
