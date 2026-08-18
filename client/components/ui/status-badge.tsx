import { CheckCircle2, Clock, XCircle, MinusCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Status (brand spec) - text + icon + colour together, never colour alone.

const KINDS = {
  success: { icon: <CheckCircle2 size={13} />, cls: "bg-green-50 text-brand-green-dark border-green-200" },
  pending: { icon: <Clock size={13} />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  error: { icon: <XCircle size={13} />, cls: "bg-red-50 text-red-600 border-red-200" },
  neutral: { icon: <MinusCircle size={13} />, cls: "bg-ink-100 text-ink-600 border-ink-200" },
  info: { icon: <HelpCircle size={13} />, cls: "bg-brand-blue-light text-brand-blue-dark border-brand-blue/20" },
} as const;

export type StatusBadgeProps = {
  label: string;
  kind?: keyof typeof KINDS;
  className?: string;
};

export function StatusBadge({ label, kind = "neutral", className }: StatusBadgeProps) {
  const k = KINDS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        k.cls,
        className
      )}
    >
      <span aria-hidden="true">{k.icon}</span>
      {label}
    </span>
  );
}

// Convenience mapping for common domain statuses → badge kinds.
export function statusKindFor(status: string | undefined): keyof typeof KINDS {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVED":
    case "CONFIRMED":
    case "PAID":
    case "COMPLETED":
    case "ACTIVE":
    case "PUBLISHED":
    case "PRESENT":
    case "PASSED":
      return "success";
    case "PENDING":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "INTERVIEW":
    case "VERIFICATION":
    case "ONGOING":
    case "SCHEDULED":
    case "IN_PROGRESS":
    case "LATE":
    case "WAITLISTED":
      return "pending";
    case "REJECTED":
    case "SUSPENDED":
    case "CANCELLED":
    case "FAILED":
    case "ABSENT":
    case "EXPIRED":
    case "NO_SHOW":
      return "error";
    case "DRAFT":
    case "HOLD":
    case "ARCHIVED":
      return "neutral";
    default:
      return "info";
  }
}
