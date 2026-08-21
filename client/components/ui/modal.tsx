"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Modal / drawer (24.1) - accessible overlay: Esc to close, backdrop click,
// focus on close button. `side` renders a right-hand drawer variant.

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: boolean; // right drawer instead of centred modal
  className?: string;
};

export function Modal({ open, onClose, title, description, children, footer, side, className }: ModalProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-deep/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full bg-white shadow-lift animate-slide-up",
          side
            ? "h-full max-h-full sm:h-auto sm:max-h-[90vh] sm:w-[420px] rounded-t-3xl sm:rounded-2xl flex flex-col"
            : "max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-4">
          <div>
            {title && <h2 className="text-lg font-bold text-deep">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-ink-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
