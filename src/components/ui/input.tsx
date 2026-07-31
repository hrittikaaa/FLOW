import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-glass-border bg-white/[0.03] px-3 py-2 text-sm text-paper placeholder:text-muted/70 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:border-focus/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
