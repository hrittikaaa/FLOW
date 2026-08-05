import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium backdrop-blur-md transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
  {
    variants: {
      variant: {
        primary:
          "bg-focus/90 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_36px_-10px_rgba(242,166,90,0.6)] hover:bg-focus",
        rest: "bg-rest/90 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_36px_-10px_rgba(111,214,198,0.6)] hover:bg-rest",
        ghost: "text-paper/80 hover:bg-white/5 hover:text-paper",
        outline: "border border-glass-border bg-white/[0.03] text-paper shadow-glass-sm hover:bg-white/[0.08]",
        danger: "bg-danger/15 text-danger shadow-glass-sm hover:bg-danger/25",
        subtle: "bg-white/[0.06] text-paper shadow-glass-sm hover:bg-white/[0.1]",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
