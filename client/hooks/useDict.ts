"use client";

import { useEffect, useState } from "react";
import { getDict, getStoredLang, type Dict, type Lang } from "@/lib/i18n";

// useDict — reactive dictionary access for the stored language.
export function useDict(): { lang: Lang; t: (key: keyof Dict) => string } {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(getStoredLang());
    const onStorage = () => setLang(getStoredLang());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const dict = getDict(lang);
  return {
    lang,
    t: (key) => dict[key] ?? key,
  };
}
