"use client";

import { useCallback, useEffect, useState } from "react";

// Saved tutors (P2 wishlist) — localStorage-backed for now; a server-side
// wishlist keyed on the session user is the documented follow-up.

export type SavedTutor = {
  slug: string;
  name: string;
  subjects: string[];
  rating: number;
};

const KEY = "nuvora-saved-tutors";

function read(): SavedTutor[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedTutor[]) : [];
  } catch {
    return [];
  }
}

function write(list: SavedTutor[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function useWishlist() {
  const [saved, setSaved] = useState<SavedTutor[]>([]);

  useEffect(() => {
    setSaved(read());
  }, []);

  const isSaved = useCallback((slug: string) => saved.some((t) => t.slug === slug), [saved]);

  const toggle = useCallback((tutor: SavedTutor) => {
    setSaved((prev) => {
      const next = prev.some((t) => t.slug === tutor.slug)
        ? prev.filter((t) => t.slug !== tutor.slug)
        : [...prev, tutor];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSaved((prev) => {
      const next = prev.filter((t) => t.slug !== slug);
      write(next);
      return next;
    });
  }, []);

  return { saved, isSaved, toggle, remove };
}
