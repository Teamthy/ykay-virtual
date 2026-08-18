import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// Data table (24.1) - typed columns with loading skeleton + empty state.

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
};

export type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: { title: string; description?: string; icon?: React.ReactNode };
  className?: string;
};

export function DataTable<T>({ columns, rows, rowKey, loading, empty, className }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={empty?.icon}
        title={empty?.title ?? "Nothing here yet"}
        description={empty?.description}
        className={className}
      />
    );
  }

  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-ink-100", className)}>
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-surface-muted text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-500",
                  c.align === "right" && "text-right",
                  c.align === "center" && "text-center",
                  c.className
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 bg-white">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-surface-muted/60">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-4 py-3 align-middle text-ink-700",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
