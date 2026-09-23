import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6FF57]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#0F2A1A] text-white hover:bg-[#0F2A1A]/90",
        gold: "bg-[#D6FF57] text-[#0F2A1A] hover:bg-[#D6FF57]/90",
        outline: "rounded-full border-[1.5px] border-black/10 bg-transparent hover:bg-[#F9F6ED]",
        ghost: "rounded-xl hover:bg-[#F9F6ED]",
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
