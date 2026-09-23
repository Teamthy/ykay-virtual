import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// Alert / banner (24.1) - text + icon + colour together, never colour alone.
// Variants: info (blue) · success (green) · warning (gold/amber) · error (red).

const VARIANTS = {
  info: {
    box: "border-[#0F2A1A]/25 bg-[#F9F6ED]/60 text-[#0F2A1A]",
    icon: <Info size={16} />,
    iconColor: "text-[#0F2A1A]",
    label: "Info",
  },
  success: {
    box: "border-[#D6FF57]/25 bg-green-50 text-[#0F2A1A]",
    icon: <CheckCircle2 size={16} />,
    iconColor: "text-[#0F2A1A]",
    label: "Success",
  },
  warning: {
    box: "border-[#D6FF57]/40 bg-[#F9F6ED]/70 text-[#0F2A1A]",
    icon: <TriangleAlert size={16} />,
    iconColor: "text-[#0F2A1A]",
    label: "Attention",
  },
  error: {
    box: "border-red-200 bg-red-50 text-[#0F2A1A]",
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
        {title && <p className="font-semibold text-[#0F2A1A]">{title}</p>}
        <div className={cn("text-[#0F2A1A]/70", title && "mt-0.5")}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
