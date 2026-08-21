"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Password input with show/hide toggle (phase 29). Consistent sizing with
// every other input in the app: h-11, rounded-lg, 1px border, gold focus.

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  id?: string;
  label?: string;
  error?: string;
};

export const INPUT_CLS =
  "h-11 w-full rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-900 " +
  "placeholder:text-ink-400 transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none disabled:opacity-50";

export function PasswordInput({ id, label, error, className, ...props }: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const inputId = id ?? props.name ?? "password";
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={show ? "text" : "password"}
          className={cn(INPUT_CLS, "pr-11", error && "border-red-400 focus:border-red-400 focus:ring-red-300", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400 transition-colors hover:text-ink-700"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
