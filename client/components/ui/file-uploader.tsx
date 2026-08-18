"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// File uploader (24.1) - drag & drop / browse, file list with remove.
// Controlled: parent owns the files array.

export type UploadedFile = { name: string; size: number };

export type FileUploaderProps = {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  hint?: string;
  className?: string;
};

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUploader({ files, onChange, accept, maxFiles = 5, hint, className }: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= maxFiles) break;
      if (!next.some((x) => x.name === f.name && x.size === f.size)) {
        next.push({ name: f.name, size: f.size });
      }
    }
    onChange(next);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand-blue bg-brand-blue-light/60" : "border-ink-200 bg-surface-subtle hover:border-brand-blue/50"
        )}
      >
        <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-blue-light text-brand-blue">
          <UploadCloud size={20} />
        </span>
        <span className="text-sm font-semibold text-ink-700">
          Drag &amp; drop files here, or <span className="text-brand-blue underline underline-offset-2">browse</span>
        </span>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Selected files">
          {files.map((f) => (
            <li
              key={`${f.name}-${f.size}`}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white px-3.5 py-2.5"
            >
              <FileText size={16} className="shrink-0 text-brand-blue" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-700">{f.name}</span>
              <span className="shrink-0 text-xs text-ink-400 tabular-nums">{fmtSize(f.size)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((x) => x !== f))}
              >
                <X size={15} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
