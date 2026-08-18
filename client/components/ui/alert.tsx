import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Alert / banner (24.1) - text + icon + colour together, never colour alone.
// Variants: info (blue) · success (green) · warning (gold/amber) · error (red).

const VARIANTS = {
  info: {
    box: "border-brand-blue/25 bg-brand-blue-light/60 text-brand-navy",
    icon: <Info size={16} />,
    iconColor: "text-brand-blue",
    label: "Info",
  },
  success: {
    box: "border-brand-green/25 bg-green-50 text-brand-navy",
    icon: <CheckCircle2 size={16} />,
    iconColor: "text-brand-green",
    label: "Success",
  },
  warning: {
    box: "border-brand-gold/40 bg-brand-gold-light/70 text-brand-navy",
    icon: <TriangleAlert size={16} />,
    iconColor: "text-brand-gold-dark",
    label: "Attention",
  },
  error: {
    box: "border-red-200 bg-red-50 text-brand-navy",
    icon: <AlertCircle size={16} />,
    iconColor: "text-red-600",
    label: "Error",
  },
} as const;

export type AlertProps = {
  variant?: keyof typeof VARIANTS;
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
};

export function Alert({ variant = "info", title, children, className, action }: AlertProps) {
  const v = VARIANTS[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3.5", v.box, className)}
    >
      <span className={cn("mt-0.5 shrink-0", v.iconColor)} aria-hidden="true">
        {v.icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title && <p className="font-semibold text-ink-900">{title}</p>}
        <div className={cn("text-ink-600", title && "mt-0.5")}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
