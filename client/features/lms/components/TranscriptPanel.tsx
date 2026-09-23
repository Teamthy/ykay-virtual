"use client";

import { useState } from "react";
import { FileText, ChevronDown } from "lucide-react";

// TranscriptPanel — collapsible plain-text transcript under a lesson card
// (recorded library, LMS course view). Collapsed by default so long
// transcripts never push the page around.

export function TranscriptPanel({ text, title = "Lesson transcript" }: { text: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-[#F9F6ED]/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs font-bold text-[#0F2A1A]/75"
      >
        <span className="flex items-center gap-1.5">
          <FileText size={13} className="text-[#0F2A1A]" /> {title}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="max-h-72 overflow-y-auto whitespace-pre-wrap border-t border-black/10 px-4 py-3 text-sm leading-relaxed text-[#0F2A1A]/75">
          {text}
        </p>
      )}
    </div>
  );
}
