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
  "h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-sm text-[#0F2A1A] " +
  "placeholder:text-[#0F2A1A]/65 transition-colors focus:border-[#D6FF57] focus:ring-2 focus:ring-[#D6FF57]/30 focus:outline-none disabled:opacity-50";

export function PasswordInput({ id, label, error, className, ...props }: PasswordInputProps) {
  const [show, setShow] = React.useState(false);
  const inputId = id ?? props.name ?? "password";
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-[#0F2A1A]/85">
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
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#0F2A1A]/65 transition-colors hover:text-[#0F2A1A]/75"
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
