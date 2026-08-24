"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/queryClient";
import { RealtimeBridge } from "@/components/RealtimeBridge";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      {/* Phase 5b: one SSE stream per signed-in tab — instant message /
          notification refreshes (polling stays as the fallback). */}
      <RealtimeBridge />
      {children}
    </QueryClientProvider>
  );
}
