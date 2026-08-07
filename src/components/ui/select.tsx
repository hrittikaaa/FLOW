import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "glass-field flex h-10 w-full items-center justify-between rounded-lg px-3 text-sm text-paper",
      "transition-colors duration-150 hover:border-focus/30 hover:bg-white/[0.08]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50",
      "data-[state=open]:border-focus/40 data-[state=open]:bg-white/[0.08]",
      "data-[placeholder]:text-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={15} className="shrink-0 text-muted" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-glass-border",
        "bg-ink-raised/95 text-paper shadow-[0_20px_48px_-16px_rgba(0,0,0,0.6)] backdrop-blur-xl",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-2.5 pr-8 text-sm outline-none",
      "text-paper/90 transition-colors duration-100",
      "data-[highlighted]:bg-focus/15 data-[highlighted]:text-paper",
      "data-[state=checked]:font-medium data-[state=checked]:text-focus",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
      <Check size={14} />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("my-1 h-px bg-glass-border", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";
