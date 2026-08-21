import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-deep text-white hover:bg-deep/90",
        gold: "bg-primary text-ink-900 hover:bg-primary/90",
        outline: "rounded-full border-[1.5px] border-ink-900 bg-transparent hover:bg-ink-50",
        ghost: "rounded-xl hover:bg-ink-100",
      },
      size: {
        default: "h-11 px-8 py-3",
        sm: "h-9 px-4",
        lg: "h-12 px-10",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => {
  return <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});
Button.displayName = "Button";
