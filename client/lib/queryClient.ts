import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 60s default, override per volatility
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error: any) => {
          if (error?.message?.includes("404")) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

// Query key factory per feature
export const qk = {
  tutors: {
    all: ["tutors"] as const,
    search: (params: Record<string, any>) => ["tutors", "search", params] as const,
    bySlug: (slug: string) => ["tutors", "slug", slug] as const,
  },
  subjects: {
    all: ["subjects"] as const,
    list: (params: Record<string, any>) => ["subjects", "list", params] as const,
    bySlug: (slug: string) => ["subjects", "slug", slug] as const,
  },
  programmes: {
    all: ["programmes"] as const,
    list: (params: Record<string, any>) => ["programmes", "list", params] as const,
    bySlug: (slug: string) => ["programmes", "slug", slug] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    byStudent: (studentId: string) => ["bookings", "student", studentId] as const,
  },
};
