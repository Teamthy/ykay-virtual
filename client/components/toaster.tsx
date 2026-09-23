"use client";

import { Toaster as Sonner } from "sonner";

// Global toast host - rich toasts (success/error/info) with brand styling.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      toastOptions={{
        className: "rounded-xl border border-black/10 shadow-lift",
        duration: 4000,
      }}
      richColors
    />
  );
}
